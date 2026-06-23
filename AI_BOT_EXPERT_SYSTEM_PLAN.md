# AI Bot Expert System Plan

## 1. Muc tieu da chot

Tai lieu nay dong vai tro la source of truth cho viec phat trien tinh nang AI bot trong ChatApp o cac session sau.

Huong di da chot:

- AI bot duoc trien khai theo huong he chuyen gia, khong theo huong chatbot tong quat nhu Bing.
- Bot chi tra loi trong pham vi kho tri thuc va tap luat cua no.
- Moi group chat co the bat/tat cac bot co san trong group setting.
- Chi truong nhom moi duoc quan ly bot trong group.
- Bot khong cho phep alias tuy y o ban dau.
- Moi bot co trigger co dinh, vi du: `@botGame`, `@botEdu`, `@botMedication`.
- Bot chi tra loi khi bi mention dung trigger.
- Moi tin nhan chi cho phep toi da 1 bot xu ly va tra loi.
- He thong co nhieu bot o tang du lieu/cau hinh, nhung khong mo rong thanh nhieu service/controller rieng cho tung bot.
- Khong trien khai summary kieu Bing.

## 2. Non-goals

Nhung dieu KHONG nam trong pham vi hien tai:

- Khong xay chatbot tong quat hoi gi cung tra loi.
- Khong tu dong nhay vao moi tin nhan trong group.
- Khong cho nguoi dung tu dat alias cho bot.
- Khong ho tro direct-message voi bot o giai doan dau.
- Khong xay admin CMS day du de chinh kho tri thuc online ngay tu dau.
- Khong tach moi bot thanh mot microservice hoac mot backend flow rieng.

## 3. Kien truc tong the da chon

### 3.1 Mot engine chung, nhieu bot definitions

He thong se co:

- 1 bot engine chung trong backend.
- Nhieu bot definitions theo domain.
- Moi bot chi khac nhau o:
  - trigger
  - ten hien thi
  - avatar
  - intents
  - examples
  - entities
  - knowledge base
  - rules

Khong lam theo kieu:

- moi bot = mot controller rieng
- moi bot = mot service rieng
- moi bot = mot socket event rieng

Thay vao do, phai dung mot flow chung va resolve bot theo trigger.

### 3.2 Hybrid data strategy

Du lieu duoc tach theo huong hybrid:

#### JSON trong backend se luu

- bot definitions mac dinh
- intents
- training examples
- entity dictionaries
- knowledge items
- rule sets
- response templates

#### MongoDB se luu

- group nao dang bat bot nao
- bot nao dang enable/disable trong tung group
- metadata cau hinh theo group neu can mo rong sau nay
- bot message duoc luu nhu message that trong lich su chat

Nguyen tac:

- knowledge goc cua bot la du lieu backend-managed
- group settings la du lieu runtime theo ngu canh chat

## 4. Runtime flow da chot

Flow xu ly mot group message co bot:

1. User gui tin nhan trong group nhu hien tai.
2. Backend luu user message nhu message binh thuong.
3. Backend emit message cua user nhu hien tai.
4. Backend parse noi dung tin nhan de tim trigger bot.
5. Neu khong co trigger hop le: ket thuc flow bot.
6. Neu co hon 1 trigger trong cung mot message: tu choi xu ly, chi cho phep 1 bot/mot lan.
7. Backend kiem tra group hien tai co bat bot do khong.
8. Neu bot da duoc bat: goi bot engine chung.
9. Bot engine thuc hien:
   - preprocess text
   - classify intent
   - extract entities/facts
   - evaluate rules
   - build response
10. Backend tao bot reply thanh message that.
11. Backend dung lai flow cap nhat conversation + socket emit nhu message thuong.

## 5. Nguyen tac invocation

Bat buoc giu cac quy tac sau:

- Chi ho tro bot trong group chat.
- Chi tra loi khi bi mention dung trigger.
- Toi da 1 bot duoc xu ly cho 1 user message.
- Neu trigger hop le nhung group chua bat bot do, bot khong tra loi.
- Neu bot khong tim thay intent/entity phu hop, tra mot fallback response gon va ro nghia.
- Khong de 2 bot cung luc tra loi cho cung 1 message.
- Khong de bot tu goi qua lai lan nhau.

## 6. Cach to chuc du lieu bot

Moi bot nen co cung mot schema logic, du du lieu la JSON hay sau nay migrate dan sang DB:

- `definition`: thong tin chung cua bot
- `intents`: danh sach y dinh
- `examples`: cac cau da gan nhan intent
- `entities`: tu dien thuc the + synonym
- `knowledge`: cac muc tri thuc co cau truc
- `rules`: tap luat IF-THEN
- `responses`: template/fallback responses

Nguyen tac quan trong:

- intent tra loi cau hoi: nguoi dung muon lam gi
- entity tra loi cau hoi: nguoi dung dang noi ve cai gi
- khong tron intent va entity vao nhau

## 7. Huong train/model

Huong hien tai khong phai LLM-style training.

Chi can mot classifier nhe cho tung bot/domain, co the dung:

- TF-IDF de vector hoa van ban
- Naive Bayes de classify intent
- rule engine de suy dien ket qua

Nguyen tac train:

- train theo tung bot/domain
- khong train chung cho tat ca domain neu da co trigger phan tach bot
- vi du: `@botGame` chi classify trong bo intents cua botGame

Dieu nay giup:

- it nhieu hon
- can it data hon
- de debug hon
- de them bot moi hon

## 8. Trien khai backend duoc khuyen nghi

Nen them mot domain rieng cho AI, vi du:

```text
backend/src/ai/
  registry/
  loaders/
  preprocess/
  classifiers/
  extractors/
  engines/
  bots/
```

Huong trach nhiem:

- `messageController`: chi detect trigger va goi bot engine sau khi luu user message
- `ai/registry`: dang ky bot definitions
- `ai/loaders`: load JSON data
- `ai/classifiers`: classify intent
- `ai/extractors`: extract entity/facts
- `ai/engines`: suy dien va build response
- `ai/bots/*`: du lieu theo domain

Khong viet knowledge hoac rules truc tiep trong controller.

## 9. Trien khai frontend duoc khuyen nghi

Frontend chi nen biet:

- group dang bat nhung bot nao
- trigger cua tung bot
- message nao la bot message
- render ten/avatar/badge cho bot

Frontend KHONG nen chua:

- rule logic
- knowledge base
- intent classifier
- entity extraction

UI can co:

- group setting cho truong nhom bat/tat bot co san
- hien thi danh sach bot da duoc them vao group
- render bot message khac user message o muc do vua du

## 10. Source of truth can giu

Can giu ro source of truth de tranh loạn du lieu:

- Bot knowledge goc: JSON trong backend
- Group enablement/config: MongoDB
- Chat history va bot replies: MongoDB Message/Conversation flow hien tai

Khong de mot phan knowledge goc nam trong controller, mot phan nam trong JSON, mot phan nam trong DB ma khong co quy tac uu tien ro rang.

## 11. Pham vi MVP nen giu

De giam rui ro, MVP nen giu cac gioi han sau:

- Ho tro group chat only
- Ho tro text only cho bot processing
- 1 bot dau tien de validate engine, uu tien `@botGame`
- Trigger co dinh, khong custom alias
- Chi truong nhom duoc bat/tat bot
- Fallback response ro rang neu bot khong hieu
- Chua xay CMS quan tri knowledge online

Sau khi bot dau tien on dinh, moi them bot thu hai de kiem tra kha nang tai su dung engine.

## 12. Session checklist cho cac lan phat trien sau

Moi khi lam tiep tinh nang nay, can giu dung cac diem sau:

1. Khong doi huong sang chatbot tong quat.
2. Khong tao service/controller rieng cho tung bot neu khong that su can thiet.
3. Khong dua knowledge va rules vao controller.
4. Khong cho 2 bot cung tra loi 1 message.
5. Khong cho bot tu trigger neu khong bi mention.
6. Khong cho alias tuy y o ban dau.
7. Knowledge goc de o JSON backend, group config de o MongoDB.
8. Bot reply phai la message that trong lich su chat.
9. Neu them bot moi, uu tien them data pack truoc, khong nhan ban logic engine.
10. Validate luong end-to-end: group setting -> trigger -> bot reply -> socket -> UI render.

## 13. Ket luan

Kien truc da chot cua tinh nang AI bot trong ChatApp la:

- expert-system bots
- hybrid data strategy
- one shared engine
- many domain bot definitions
- group-level enablement
- fixed triggers
- mention-only responses
- one bot per message

Tat ca phat trien ve sau can bam sat tai lieu nay de tranh truot scope va tranh lam phinh kien truc khong can thiet.