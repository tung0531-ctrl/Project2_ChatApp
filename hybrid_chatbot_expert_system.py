"""
Hybrid Chatbot Expert System in Python.

Pipeline is kept exactly in this order:
1. Load CLINC150 dataset (or a local mock subset fallback).
2. Apply synonym normalization.
3. Remove custom stop words.
4. Vectorize text with TF-IDF using unigrams + bigrams.
5. Train an SVM-style intent classifier with SGD and learning-rate decay.
6. Pass predicted intent into a Forward Chaining inference engine.
7. Return the final expert-system response.

Suggested dependencies:
  pip install datasets scikit-learn numpy
"""

from __future__ import annotations

import json
import random
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

try:
    from datasets import load_dataset
except Exception:  # pragma: no cover - fallback is handled at runtime
    load_dataset = None


def build_mock_clinc_subset() -> List[Dict[str, str]]:
    """Fallback subset used when Hugging Face loading is unavailable."""

    return [
        {"text": "show me my bank balance", "intent": "balance"},
        {"text": "what is left in my checking account", "intent": "balance"},
        {"text": "how much money do i have", "intent": "balance"},
        {"text": "transfer money to savings", "intent": "transfer"},
        {"text": "send 200 dollars to my savings account", "intent": "transfer"},
        {"text": "move funds to another account", "intent": "transfer"},
        {"text": "i forgot my password", "intent": "reset_password"},
        {"text": "help me change my password", "intent": "reset_password"},
        {"text": "reset my login password", "intent": "reset_password"},
        {"text": "where is my card", "intent": "card_status"},
        {"text": "is my debit card active", "intent": "card_status"},
        {"text": "check my card status", "intent": "card_status"},
        {"text": "i want to track my order", "intent": "order_status"},
        {"text": "where is my package", "intent": "order_status"},
        {"text": "check shipping status", "intent": "order_status"},
        {"text": "book a flight to paris", "intent": "book_flight"},
        {"text": "i need an airline ticket", "intent": "book_flight"},
        {"text": "reserve a plane ticket", "intent": "book_flight"},
        {"text": "what is the weather today", "intent": "weather"},
        {"text": "tell me the forecast", "intent": "weather"},
        {"text": "will it rain tomorrow", "intent": "weather"},
        {"text": "hello", "intent": "greeting"},
        {"text": "hi there", "intent": "greeting"},
        {"text": "good morning", "intent": "greeting"},
        {"text": "bye", "intent": "goodbye"},
        {"text": "see you later", "intent": "goodbye"},
        {"text": "good night", "intent": "goodbye"},
    ]


class CLINC150DatasetLoader:
    """Loads CLINC150 from the local root dataset first, then falls back if needed."""

    def __init__(self, sample_size: Optional[int] = None, random_seed: int = 42) -> None:
        self.sample_size = sample_size
        self.random_seed = random_seed
        self.local_dataset_path = (
            Path(__file__).resolve().parent
            / "clinc150"
            / "clinc150_uci"
            / "data_full.json"
        )

    def load(self) -> List[Dict[str, str]]:
        dataset_rows = self._load_from_local_file()
        if dataset_rows:
            return dataset_rows

        # The previous dataset sources are intentionally disabled for now.
        # dataset_rows = self._load_from_huggingface()
        # if dataset_rows:
        #     return dataset_rows
        # return build_mock_clinc_subset()

        raise FileNotFoundError(
            f"Local CLINC150 dataset not found or invalid: {self.local_dataset_path}"
        )

    def _load_from_local_file(self) -> List[Dict[str, str]]:
        if not self.local_dataset_path.exists():
            return []

        try:
            with self.local_dataset_path.open("r", encoding="utf-8") as dataset_file:
                payload = json.load(dataset_file)
        except Exception:
            return []

        rows: List[Dict[str, str]] = []

        # Local CLINC150 JSON is organized by split keys such as train/val/test/oos_*.
        for split_name in ("train", "val", "test"):
            split_rows = payload.get(split_name, [])
            if not isinstance(split_rows, list):
                continue

            for sample in split_rows:
                if not isinstance(sample, list) or len(sample) != 2:
                    continue

                text, intent = sample
                if not isinstance(text, str) or not isinstance(intent, str):
                    continue

                text = text.strip()
                intent = intent.strip()

                if not text or not intent or intent == "oos":
                    continue

                rows.append({"text": text, "intent": intent})

        if not rows:
            return []

        random.Random(self.random_seed).shuffle(rows)
        if self.sample_size is not None and len(rows) > self.sample_size:
            return rows[: self.sample_size]
        return rows

    def _load_from_huggingface(self) -> List[Dict[str, str]]:
        if load_dataset is None:
            return []

        try:
            dataset = load_dataset("clinc_oos", "plus")
        except Exception:
            return []

        rows: List[Dict[str, str]] = []
        splits = [split for split in ("train", "validation", "test") if split in dataset]

        for split_name in splits:
            split = dataset[split_name]
            for item in split:
                text = self._extract_text(item)
                intent = self._extract_intent(item)

                if not text or not intent:
                    continue

                if intent == "oos":
                    continue

                rows.append({"text": text, "intent": intent})

        if not rows:
            return []

        random.Random(self.random_seed).shuffle(rows)
        if self.sample_size is not None and len(rows) > self.sample_size:
            return rows[: self.sample_size]
        return rows

    @staticmethod
    def _extract_text(item: Dict[str, object]) -> Optional[str]:
        for key in ("text", "utterance", "sentence"):
            value = item.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return None

    @staticmethod
    def _extract_intent(item: Dict[str, object]) -> Optional[str]:
        for key in ("intent", "intent_label", "label_text"):
            value = item.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return None


class TextPreprocessor:
    """Applies synonym mapping and custom stop-word removal before vectorization."""

    def __init__(self, synonym_map: Dict[str, str], stop_words: Iterable[str]) -> None:
        self.synonym_map = synonym_map
        self.stop_words = set(stop_words)

    def normalize_synonyms(self, text: str) -> str:
        # Synonym technique is applied here before tokenization.
        tokens = self._tokenize(text)
        normalized_tokens = [self.synonym_map.get(token, token) for token in tokens]
        return " ".join(normalized_tokens)

    def remove_custom_stop_words(self, text: str) -> str:
        # Custom stop-word filtering is applied here.
        tokens = self._tokenize(text)
        filtered_tokens = [token for token in tokens if token not in self.stop_words]
        return " ".join(filtered_tokens)

    def preprocess(self, text: str) -> str:
        text = self.normalize_synonyms(text)
        text = self.remove_custom_stop_words(text)
        return text

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        return re.findall(r"[a-z0-9']+", text.lower())


class EntityExtractor:
    """Keyword-based entity extraction feeding extra facts into working memory."""

    def __init__(self, entity_keywords: Dict[str, Sequence[str]]) -> None:
        self.entity_keywords = entity_keywords

    def extract(self, normalized_text: str) -> Set[str]:
        facts: Set[str] = set()
        padded_text = f" {normalized_text} "

        for entity_name, keywords in self.entity_keywords.items():
            for keyword in keywords:
                if f" {keyword} " in padded_text:
                    facts.add(f"entity:{entity_name}")
                    break

        return facts


class IntentClassifierSVM:
    """TF-IDF + linear SVM optimized with SGD."""

    def __init__(
        self,
        preprocessor: TextPreprocessor,
        eta0: float = 0.05,
        decay_k: float = 0.01,
        epochs: int = 5,
        random_seed: int = 42,
    ) -> None:
        self.preprocessor = preprocessor
        self.eta0 = eta0
        self.decay_k = decay_k
        self.epochs = epochs
        self.random_seed = random_seed
        self.pipeline: Optional[Pipeline] = None
        self.classes_: Optional[np.ndarray] = None

    def build_pipeline(self) -> Pipeline:
        return Pipeline(
            steps=[
                (
                    "tfidf",
                    TfidfVectorizer(
                        preprocessor=self.preprocessor.preprocess,
                        tokenizer=str.split,
                        token_pattern=None,
                        ngram_range=(1, 2),  # N-gram technique: unigram + bigram.
                        smooth_idf=True,  # Laplace-like smoothing in IDF.
                        lowercase=False,
                    ),
                ),
                (
                    "svm",
                    SGDClassifier(
                        loss="hinge",  # Linear SVM objective.
                        learning_rate="invscaling",
                        eta0=self.eta0,
                        power_t=1.0,
                        alpha=1e-4,
                        max_iter=1,
                        tol=None,
                        shuffle=False,
                        random_state=self.random_seed,
                        warm_start=True,
                    ),
                ),
            ]
        )

    def fit(self, texts: Sequence[str], labels: Sequence[str]) -> None:
        processed_texts = [self.preprocessor.preprocess(text) for text in texts]
        self.classes_ = np.array(sorted(set(labels)))

        vectorizer = TfidfVectorizer(
            tokenizer=str.split,
            token_pattern=None,
            ngram_range=(1, 2),  # N-gram technique is preserved here.
            smooth_idf=True,  # Smooth IDF prevents zero division.
            lowercase=False,
        )
        features = vectorizer.fit_transform(processed_texts)

        classifier = SGDClassifier(
            loss="hinge",
            learning_rate="constant",
            eta0=self.eta0,
            alpha=1e-4,
            max_iter=1,
            tol=None,
            shuffle=False,
            random_state=self.random_seed,
            warm_start=True,
        )

        sample_indices = np.arange(features.shape[0])
        step = 0

        for epoch in range(self.epochs):
            np.random.default_rng(self.random_seed + epoch).shuffle(sample_indices)
            for index in sample_indices:
                x_i = features[index]
                y_i = np.array([labels[index]])

                # Decay technique is demonstrated here with eta_t = eta0 / (1 + k t).
                current_eta = self.decayed_learning_rate(step)
                classifier.set_params(eta0=current_eta)

                if step == 0:
                    classifier.partial_fit(x_i, y_i, classes=self.classes_)
                else:
                    classifier.partial_fit(x_i, y_i)
                step += 1

        self.pipeline = Pipeline(
            steps=[("tfidf", vectorizer), ("svm", classifier)]
        )

    def predict(self, text: str) -> str:
        if self.pipeline is None:
            raise RuntimeError("Model has not been trained yet.")
        return str(self.pipeline.predict([self.preprocessor.preprocess(text)])[0])

    def evaluate(self, texts: Sequence[str], labels: Sequence[str]) -> Dict[str, str]:
        if self.pipeline is None:
            raise RuntimeError("Model has not been trained yet.")

        processed_texts = [self.preprocessor.preprocess(text) for text in texts]
        predictions = self.pipeline.predict(processed_texts)
        accuracy = accuracy_score(labels, predictions)
        report = classification_report(labels, predictions, zero_division=0)
        return {
            "accuracy": f"{accuracy:.4f}",
            "report": report,
        }

    def decayed_learning_rate(self, step: int) -> float:
        return self.eta0 / (1.0 + self.decay_k * step)


@dataclass
class Rule:
    name: str
    conditions: Set[str]
    inferred_facts: Set[str] = field(default_factory=set)
    response: Optional[str] = None


class ForwardChainingInferenceEngine:
    """Simple forward-chaining engine using predicted intent as an initial fact."""

    def __init__(self, rules: Sequence[Rule]) -> None:
        self.rules = list(rules)

    def infer(self, initial_facts: Iterable[str]) -> Tuple[Set[str], str]:
        working_memory = set(initial_facts)
        fired_rules: Set[str] = set()
        final_response: Optional[str] = None

        changed = True
        while changed:
            changed = False
            for rule in self.rules:
                if rule.name in fired_rules:
                    continue

                # Forward Chaining technique is applied here.
                if rule.conditions.issubset(working_memory):
                    fired_rules.add(rule.name)
                    before_size = len(working_memory)
                    working_memory.update(rule.inferred_facts)
                    if len(working_memory) > before_size:
                        changed = True
                    if rule.response is not None:
                        final_response = rule.response

        if final_response is None:
            final_response = (
                "I inferred the intent, but no expert-system rule produced a final answer."
            )

        return working_memory, final_response


class HybridChatbotExpertSystem:
    """End-to-end orchestrator that keeps the requested pipeline intact."""

    def __init__(self) -> None:
        synonym_map = {
            "hi": "hello",
            "hey": "hello",
            "morning": "morning",
            "funds": "money",
            "cash": "money",
            "bucks": "dollars",
            "pwd": "password",
            "passcode": "password",
            "airline": "flight",
            "plane": "flight",
            "forecast": "weather",
            "package": "order",
            "shipment": "order",
            "checking": "account",
            "savings": "account",
            "debit": "card",
        }

        custom_stop_words = {
            "a",
            "an",
            "the",
            "is",
            "are",
            "to",
            "of",
            "for",
            "me",
            "my",
            "i",
            "you",
            "please",
            "do",
            "can",
            "could",
            "would",
            "tell",
        }

        entity_keywords = {
            "account": ["account", "balance", "money", "transfer", "dollars"],
            "credentials": ["password", "login"],
            "card": ["card"],
            "order": ["order", "shipping"],
            "travel": ["flight", "ticket", "paris"],
            "weather": ["weather", "rain"],
        }

        self.dataset_loader = CLINC150DatasetLoader()
        self.preprocessor = TextPreprocessor(synonym_map, custom_stop_words)
        self.entity_extractor = EntityExtractor(entity_keywords)
        self.classifier = IntentClassifierSVM(self.preprocessor)
        self.inference_engine = ForwardChainingInferenceEngine(self._build_rules())

    def _build_rules(self) -> List[Rule]:
        return [
            Rule(
                name="balance_to_support",
                conditions={"intent:balance"},
                inferred_facts={"task:banking_lookup"},
            ),
            Rule(
                name="balance_response",
                conditions={"task:banking_lookup", "entity:account"},
                inferred_facts={"answer:balance_guidance"},
                response=(
                    "Your request is about account balance. The expert-system conclusion is: "
                    "authenticate the user, query the ledger service, and return the latest balance."
                ),
            ),
            Rule(
                name="transfer_to_support",
                conditions={"intent:transfer"},
                inferred_facts={"task:transfer_flow"},
            ),
            Rule(
                name="transfer_response",
                conditions={"task:transfer_flow", "entity:account"},
                inferred_facts={"answer:transfer_guidance"},
                response=(
                    "This is a money-transfer request. The expert-system conclusion is: "
                    "collect source account, destination account, amount, then validate balance before transfer."
                ),
            ),
            Rule(
                name="password_to_support",
                conditions={"intent:reset_password"},
                inferred_facts={"task:credential_recovery"},
            ),
            Rule(
                name="password_response",
                conditions={"task:credential_recovery", "entity:credentials"},
                inferred_facts={"answer:reset_password_guidance"},
                response=(
                    "This is a password-reset request. The expert-system conclusion is: "
                    "verify identity, issue a reset token, and guide the user through password update."
                ),
            ),
            Rule(
                name="card_response",
                conditions={"intent:card_status", "entity:card"},
                inferred_facts={"answer:card_support"},
                response=(
                    "This is a card-status request. The expert-system conclusion is: "
                    "check card activation, block state, and recent delivery or transaction events."
                ),
            ),
            Rule(
                name="order_response",
                conditions={"intent:order_status", "entity:order"},
                inferred_facts={"answer:order_tracking"},
                response=(
                    "This is an order-status request. The expert-system conclusion is: "
                    "retrieve shipment data and return the current delivery checkpoint."
                ),
            ),
            Rule(
                name="flight_response",
                conditions={"intent:book_flight", "entity:travel"},
                inferred_facts={"answer:flight_booking"},
                response=(
                    "This is a flight-booking request. The expert-system conclusion is: "
                    "collect route, travel date, and passenger details before showing flight options."
                ),
            ),
            Rule(
                name="weather_response",
                conditions={"intent:weather", "entity:weather"},
                inferred_facts={"answer:weather_lookup"},
                response=(
                    "This is a weather request. The expert-system conclusion is: "
                    "identify the location and return forecast or rain probability for the requested time."
                ),
            ),
            Rule(
                name="greeting_response",
                conditions={"intent:greeting"},
                inferred_facts={"answer:greeting"},
                response="Hello. I am ready to classify your intent and reason over the rule base.",
            ),
            Rule(
                name="goodbye_response",
                conditions={"intent:goodbye"},
                inferred_facts={"answer:goodbye"},
                response="Goodbye. The expert-system session has ended.",
            ),
        ]

    def train(self) -> Dict[str, str]:
        rows = self.dataset_loader.load()
        texts = [row["text"] for row in rows]
        labels = [row["intent"] for row in rows]

        x_train, x_test, y_train, y_test = train_test_split(
            texts,
            labels,
            test_size=0.25,
            random_state=42,
            stratify=labels if len(set(labels)) > 1 else None,
        )

        self.classifier.fit(x_train, y_train)
        metrics = self.classifier.evaluate(x_test, y_test)
        metrics["dataset_size"] = str(len(rows))
        metrics["intents"] = str(len(set(labels)))
        return metrics

    def predict_and_reason(self, user_text: str) -> Dict[str, object]:
        predicted_intent = self.classifier.predict(user_text)
        normalized_text = self.preprocessor.preprocess(user_text)

        initial_facts = {
            f"intent:{predicted_intent}",  # Predicted intent is the initial fact.
        }
        initial_facts.update(self.entity_extractor.extract(normalized_text))

        working_memory, response = self.inference_engine.infer(initial_facts)

        return {
            "input": user_text,
            "normalized_text": normalized_text,
            "predicted_intent": predicted_intent,
            "working_memory": sorted(working_memory),
            "response": response,
        }


def main() -> None:
    system = HybridChatbotExpertSystem()
    metrics = system.train()

    print("=" * 80)
    print("HYBRID CHATBOT EXPERT SYSTEM")
    print("=" * 80)
    print(f"Dataset size: {metrics['dataset_size']}")
    print(f"Intent classes: {metrics['intents']}")
    print(f"Accuracy: {metrics['accuracy']}")
    print("Learning-rate decay example:")
    for step in range(5):
        eta_t = system.classifier.decayed_learning_rate(step)
        print(f"  step={step:02d} -> eta_t = {eta_t:.6f}")

    print("\nClassification report:")
    print(metrics["report"])

    sample_queries = [
        "hey, can you show my checking balance?",
        "please transfer 250 bucks to savings",
        "i forgot my passcode",
        "check my debit card status",
        "where is my package now",
    ]

    print("\nSample expert-system outputs:")
    for query in sample_queries:
        result = system.predict_and_reason(query)
        print("-" * 80)
        print(f"Input: {result['input']}")
        print(f"Normalized: {result['normalized_text']}")
        print(f"Predicted intent: {result['predicted_intent']}")
        print(f"Working memory: {', '.join(result['working_memory'])}")
        print(f"Response: {result['response']}")


if __name__ == "__main__":
    main()