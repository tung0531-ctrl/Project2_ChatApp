# ChatApp Project Guide

## 1. Muc dich tai lieu

Tai lieu nay la base ky thuat cho du an ChatApp. Muc tieu la giup moi thay doi trong tuong lai:

- hieu dung kien truc tong the cua du an
- them tinh nang moi ma van giu duoc phong cach code nhat quan
- tranh xung dot giua frontend, backend, state, API va socket
- giam rui ro sai convention, sai ten, sai luong du lieu, sai cach to chuc file

Tai lieu duoc tong hop tu code hien tai trong repo, khong phai tu README mac dinh.

## 2. Tong quan du an

ChatApp la ung dung chat real-time gom 2 phan:

- `frontend`: React + TypeScript + Vite, quan ly UI, state, route, form, giao tiep API va Socket.IO client.
- `backend`: Node.js + Express + MongoDB + Socket.IO, cung cap API, xac thuc, quan ly ban be, hoi thoai, tin nhan, upload avatar.

Tinh nang chinh da co trong code:

- dang ky, dang nhap, dang xuat, refresh token
- lay thong tin user hien tai
- cap nhat thong tin ca nhan user
- doi tai khoan va doi mat khau co xac thuc mat khau cu
- tim user theo username voi co che query filter gan dung, khong can khop exact
- gui, chap nhan, tu choi loi moi ket ban
- lay danh sach ban be
- huy ket ban, dong thoi xoa direct conversation va lich su chat lien quan
- xoa mem thong bao da nhan va loi moi da gui ngay tren server, khong hard-delete du lieu
- xem profile cua nguoi dung khac tu danh sach ban be/direct chat
- tao direct conversation va group conversation
- tim va tham gia vao group chat co san bang ten nhom
- roi khoi group chat
- xem thong tin group chat
- sua mo ta group chat cho truong nhom
- truong nhom co the kick thanh vien khoi group
- gui tin nhan direct va group voi text, anh, GIF, video va tep dinh kem thong dung
- lay danh sach conversation va lich su tin nhan
- danh dau da xem tin nhan
- hien thi avatar nhung nguoi da xem tin nhan cuoi
- he thong thong bao cho loi moi ket ban, tham gia nhom, bi kick khoi nhom
- badge thong bao chua doc o header sidebar
- online presence bang Socket.IO
- upload avatar va tep chat len Cloudinary
- sidebar chat cho phep resize khung nhin giua danh sach nhom chat va danh sach ban be
- giao dien sang/toi

## 3. Cong nghe va thu vien duoc su dung

### Frontend

- React 19
- TypeScript
- Vite
- React Router
- Zustand
- Axios
- Socket.IO Client
- Tailwind CSS v4
- Radix UI
- shadcn/ui structure
- React Hook Form
- Zod
- Sonner
- Lucide React
- Emoji Mart
- tailwind-scrollbar
- tailwindcss-animate

### Backend

- Node.js
- Express 5
- Mongoose
- JWT (`jsonwebtoken`)
- bcrypt
- cookie-parser
- cors
- multer
- Cloudinary
- Socket.IO
- swagger-ui-express
- dotenv
- nodemon

## 4. Cau truc thu muc

```text
backend/
  package.json
  src/
    server.js                # diem vao backend
    swagger.json             # tai lieu API dang su dung
    controllers/             # xu ly nghiep vu theo module, da co them notificationController
    libs/                    # ket noi DB
    middlewares/             # auth, upload, friend check, socket auth
    models/                  # Mongoose schema/model, da co them Notification
    routes/                  # dinh nghia endpoint, da co them notificationRoute
    socket/                  # khoi tao Socket.IO
    utils/                   # helper nghiep vu, da co them notificationHelper

frontend/
  package.json
  components.json           # cau hinh shadcn/ui
  eslint.config.js          # rule lint frontend
  tailwind.config.ts        # theme extension
  vite.config.ts            # alias, plugin
  src/
    App.tsx                 # router goc
    index.css               # design tokens, utility classes
    main.tsx                # diem vao frontend
    components/             # UI theo feature + shared ui
    hooks/                  # custom hooks
    lib/                    # axios instance, utils
    pages/                  # page-level components
    services/               # call API layer
    stores/                 # Zustand stores
    types/                  # TypeScript types
```

## 5. Kien truc tong the

### 5.1 Frontend flow

Luot chay chinh:

1. User thao tac tren component.
2. Component goi method trong store hoac form submit handler.
3. Store goi `service` de giao tiep API.
4. Axios tu dong gan access token vao header.
5. Neu token het han, interceptor thu refresh token.
6. Store cap nhat state va hien toast.
7. Socket cap nhat real-time cac conversation, message, online users.

Kieu tach lop dang duoc dung:

- `components/`: render UI va xu ly interaction nhe
- `pages/`: ghep layout cap trang
- `services/`: chua request HTTP, khong chua UI
- `stores/`: giu state app + orchestration
- `types/`: chua contract TypeScript dung chung
- `lib/axios.ts`: diem tap trung auth, retry, refresh

Frontend hien tai da mo rong them mot notification slice rieng:

- `notificationService`: call API thong bao
- `useNotificationStore`: giu danh sach thong bao + unread count
- `FriendRequestDialog`: hien gio dong vai tro dialog thong bao tong hop, khong chi rieng friend request

Frontend hien tai cung da mo rong them mot attachment flow trong chat:

- `MessageInput`: chon file tu may nguoi dung, preview nhanh truoc khi gui
- `chatService.uploadMessageMedia`: upload media/attachment len backend
- `MessageItem`: render inline cho anh/video, render attachment card cho file khac
- `DirectMessageCard`: co fallback preview cho tin nhan cuoi neu chi co media/file

### 5.2 Backend flow

Luot chay chinh:

1. Route nhan request.
2. Middleware xac thuc va bo sung `req.user` hoac du lieu phu.
3. Controller validate input, goi model, xu ly nghiep vu.
4. Controller tra JSON response theo module.
5. Neu co real-time event, emit qua Socket.IO.

Kieu tach lop dang duoc dung:

- `routes/`: chi map URL sang middleware/controller
- `middlewares/`: auth, upload, friendship check, socket auth
- `controllers/`: nghiep vu chinh
- `models/`: schema va index MongoDB
- `utils/`: helper logic dung lai
- `socket/`: quan ly server socket va room

Backend hien tai da co them notification domain rieng de phuc vu thong bao real-time va luu lich su thong bao.

Backend hien tai cung da ho tro attachment messaging theo flow rieng:

- `POST /messages/upload`: upload file len Cloudinary
- `sendDirectMessage` va `sendGroupMessage`: chap nhan text-only, media-only, hoac text + media
- `Message` va `Conversation.lastMessage`: luu them metadata file/media de phuc vu preview va render

## 6. Quy uoc to chuc module

### Frontend

- Component UI theo feature duoc dat trong `src/components/<feature>/`.
- Shared UI primitives dat trong `src/components/ui/`.
- Moi domain co service rieng: `authService`, `chatService`, `friendService`, `userService`, `notificationService`.
- Moi domain lon co store rieng: `useAuthStore`, `useChatStore`, `useFriendStore`, `useSocketStore`, `useNotificationStore`, `useUserStore`.
- Kieu du lieu tong hop dat trong `src/types/`.

### Backend

- Moi domain nen duy tri day du 4 lop: `route -> middleware -> controller -> model` khi can.
- Ten route file theo domain: `authRoute.js`, `conversationRoute.js`, `notificationRoute.js`.
- Ten controller theo domain: `authController.js`, `messageController.js`, `notificationController.js`.
- Ten model theo business entity: `User.js`, `Conversation.js`, `Message.js`, `Notification.js`.

## 7. Quy uoc cu phap va phong cach ham

Day la phan quan trong de phat trien them tinh nang ma van dong bo voi code hien tai.

### 7.1 Kieu import/export

Du an dang dung ES Modules o ca frontend va backend.

Quy uoc hien tai:

- dung `import ... from ...`
- dung `export default` cho module co mot thuc the chinh
- dung `export const ...` cho nhieu ham hoac gia tri cung file

Vi du:

```ts
import api from "@/lib/axios";
import { useAuthStore } from "@/stores/useAuthStore";

export const chatService = {
  async fetchConversations() {
    const res = await api.get("/conversations");
    return res.data;
  },
};
```

```js
export const signIn = async (req, res) => {
  try {
    // business logic
  } catch (error) {
    return res.status(500).json({ message: "Loi he thong" });
  }
};
```

### 7.2 Kieu dinh nghia ham dang duoc su dung

#### Frontend

1. Component root hoac component co ten ro rang co the dung `function`:

```tsx
function App() {
  return <div />;
}
```

2. Phan lon component dang dung arrow function:

```tsx
const ChatAppPage = () => {
  return <div />;
};
```

3. Event handler va submit handler dung `const` + `async` arrow:

```tsx
const onSubmit = async (data: SignInFormValues) => {
  await signIn(data.username, data.password);
};
```

4. Store methods dung object property + arrow function:

```ts
setAccessToken: (accessToken) => {
  set({ accessToken });
},
fetchMe: async () => {
  const user = await authService.fetchMe();
  set({ user });
},
```

5. Service methods dung `async` method shorthand trong object:

```ts
async fetchMessages(id: string, cursor?: string) {
  const res = await api.get(`/conversations/${id}/messages?cursor=${cursor}`);
  return res.data;
}
```

#### Backend

1. Controllers dung named export + async arrow function:

```js
export const createConversation = async (req, res) => {
  // ...
};
```

2. Middleware dung named export + function arrow:

```js
export const protectedRoute = (req, res, next) => {
  // ...
};
```

3. Helper co the dung `export const` hoac function thuong, nhung nen uu tien theo style hien tai la arrow function neu khong can hoisting.

### 7.3 Quy uoc cu phap nen tiep tuc giu

- Uu tien `const` cho ham va bien khong can gan lai.
- Uu tien `async/await`, khong mo rong them `.then().catch()` neu khong that su can.
- Dung early return de giam nesting.
- Dung object destructuring cho `req.body`, `req.query`, `req.user`, props, store state.
- Dung semicolon o cuoi cau lenh.
- Dung dau ngoac kep `"..."` dong nhat voi code hien tai.
- Dung indentation 2 spaces theo style hien co.

## 8. Quy uoc dat ten

### Frontend

- Component: PascalCase, vi du `ChatWindowLayout`, `MessageInput`.
- Page: PascalCase + hau to `Page`, vi du `SignInPage`, `ChatAppPage`.
- Hook/store: camelCase, bat dau bang `use`, vi du `useAuthStore`, `useSocketStore`.
- Service: camelCase + hau to `Service`, vi du `chatService`.
- Type/interface: PascalCase, vi du `Conversation`, `AuthState`.
- Utility function: camelCase.

### Backend

- Controller function: camelCase, vi du `signIn`, `getConversations`, `uploadAvatar`.
- Route file: `<domain>Route.js`.
- Controller file: `<domain>Controller.js`.
- Model file: PascalCase, vi du `User.js`, `Conversation.js`.
- Middleware file: camelCase + `Middleware`, vi du `authMiddleware.js`, `uploadMiddleware.js`.

### Luu y ve bat nhat trong repo hien tai

Repo hien co mot vai diem chua dong bo 100%:

- co file kebab-case nhu `signin-form.tsx`, `app-sidebar.tsx`
- co file PascalCase nhu `ChatAppPage.tsx`, `ChatWindowLayout.tsx`
- co comment va text vua Tieng Viet vua Tieng Anh

Khuyen nghi:

- khong rename le tung file dang hoat dong neu khong refactor ca cum module
- voi file moi, uu tien theo pattern da ton tai trong tung khu vuc
- neu mo rong mot feature da co, giu naming style dong bo voi feature do thay vi ap mot style moi len nua chung

## 9. Quy uoc frontend chi tiet

### 9.1 Routing

- Router duoc khai bao trong `src/App.tsx`.
- Route public: `signin`, `signup`.
- Route private duoc bao boi `ProtectedRoute`.
- Khi them page moi:
  - neu can dang nhap, dat ben trong `ProtectedRoute`
  - neu la page auth/public, dat ngoai `ProtectedRoute`

### 9.2 State management bang Zustand

Pattern hien tai:

- Store chua state + action + side-effect orchestration.
- Store goi service, khong de component goi API truc tiep neu logic da thuoc domain.
- Store co the hien toast va reset store khac neu can.

Quy tac de tranh xung dot:

- khong duplicate state da co o store vao local component neu state do dung chung
- component chi giu local state cho UI tam thoi
- business flow va loading state dat trong store
- neu action anh huong nhieu domain, phai xem xet tuong tac giua stores

Vi du dang dung:

- `useAuthStore` dieu phoi login, logout, refresh, fetchMe
- `useChatStore` quan ly conversation, message, markAsSeen
- `useChatStore` cung quan ly them create group, join group, leave group, kick member, update group description
- `useChatStore` cung quan ly upload attachment metadata va sap xep lai conversations theo hoat dong moi nhat
- `useSocketStore` quan ly ket noi socket va event listeners
- `useUserStore` quan ly upload avatar, update profile va update account security
- `useFriendStore` quan ly search user, gui loi moi, lay requests, huy ket ban
- `useNotificationStore` quan ly notifications, unread badge va xoa mem thong bao da nhan

### 9.3 Service layer

Quy tac:

- moi request HTTP dat trong `src/services/`
- service tra ve du lieu da duoc boc tach can thiet cho store
- khong dat toast trong service
- khong thao tac UI trong service
- khong hard-code full URL, luon di qua `api` trong `src/lib/axios.ts`

### 9.4 Axios va auth flow

`src/lib/axios.ts` la diem tap trung auth request:

- `baseURL` lay tu `VITE_API_URL`
- tu dong gan `Authorization: Bearer <accessToken>`
- neu bi `403`, thu refresh token toi da nhieu lan
- refresh thanh cong thi cap nhat token va retry request
- refresh that bai thi clear auth state
- auth state va chat state duoc persist theo `sessionStorage` de giam xung dot giua nhieu tab/tai khoan

Quy tac mo rong:

- khong tu tao axios instance khac neu khong co ly do rat ro rang
- khong xu ly refresh token lan 2 o service hoac component
- khong truyen token thu cong trong tung API call

Mot so flow service/store quan trong da co hien tai:

- `userService.updateProfile` + `useUserStore.updateProfile`
- `userService.updateAccountSecurity` + `useUserStore.updateAccountSecurity`
- `userService.fetchUserProfile` + dialog profile read-only cua nguoi dung khac
- `chatService.leaveGroup` + `useChatStore.leaveGroup`
- `chatService.kickGroupMember` + `useChatStore.kickGroupMember`
- `chatService.updateGroupDescription` + `useChatStore.updateGroupDescription`
- `chatService.searchJoinableGroups` + `useChatStore.searchJoinableGroups`
- `chatService.joinGroup` + `useChatStore.joinGroup`
- `chatService.uploadMessageMedia` + `useChatStore.uploadMessageMedia`
- `friendService.unfriend` + `useFriendStore.unfriend`
- `friendService.hideSentRequest` + `useFriendStore.hideSentRequest`
- `notificationService.fetchNotifications` + `useNotificationStore.fetchNotifications`
- `notificationService.hideNotification` + `useNotificationStore.hideNotification`

### 9.5 Form va validation

Pattern hien tai:

- form quan trong dung `react-hook-form`
- validation schema dung `zod`
- ket noi qua `zodResolver`

Quy tac mo rong:

- form moi nen co schema ro rang
- loi validation tra ve duoi input bang component text don gian
- khong validate thu cong tung field neu da co schema

### 9.6 Styling va UI

Stack UI hien tai:

- Tailwind CSS
- Radix UI
- shadcn/ui structure
- custom utility classes trong `src/index.css`

Quy tac styling:

- uu tien utility classes cua Tailwind
- dung lai token mau, shadow, gradient, radius da khai bao trong CSS variables
- uu tien component primitives trong `src/components/ui/`
- neu can style dac thu, them utility class co y nghia trong `index.css` thay vi lap lai class dai nhieu noi

Token va motif hien tai:

- chu de chat gradient, glow, glass, rounded corners mem
- ho tro dark mode bang class `.dark`
- co utility classes nhu `glass`, `glass-strong`, `bg-gradient-chat`, `shadow-soft`, `beautiful-scrollbar`, `error-message`

Khong nen:

- them mau tu do khong qua token co san neu khong can thiet
- tron nhieu motif moi khac han visual hien tai trong cung feature
- viet CSS roi rac ngoai he token neu co the bieu dien bang Tailwind + custom vars

## 10. Quy uoc backend chi tiet

### 10.1 Route va controller

Pattern route:

```js
router.post("/", middleware, controller);
router.get("/:id/messages", controller);
router.patch("/:id/seen", controller);
```

Mot so endpoint nghiep vu da co hien tai:

- `PATCH /users/me`
- `PATCH /users/security`
- `GET /users/:userId/profile`
- `PATCH /conversations/:conversationId/leave`
- `PATCH /conversations/:conversationId/members/:memberId/kick`
- `PATCH /conversations/:conversationId/description`
- `GET /conversations/groups/search?name=...`
- `PATCH /conversations/:conversationId/join`
- `GET /notifications`
- `PATCH /notifications/read-all`
- `PATCH /notifications/:notificationId/hide`
- `PATCH /friends/requests/:requestId/hide`
- `POST /messages/upload`
- `DELETE /friends/:friendId`

Pattern controller:

- validate input o dau ham
- tra `400`, `401`, `403`, `404`, `409` tuy truong hop
- xu ly chinh trong `try/catch`
- log loi bang `console.error`
- response dang JSON object co `message` hoac object domain

### 10.2 Auth va session

Backend dang dung mo hinh:

- access token: JWT, song ngan, gui qua header Authorization
- refresh token: random token, luu trong DB bang model `Session`
- refresh token cung duoc luu trong cookie httpOnly

Quy tac mo rong:

- route private phai di qua `protectedRoute`
- khong doc token truc tiep o moi controller nua
- khong duplicate auth verification ngoai middleware neu khong can thiet

### 10.3 Mongoose model

Pattern hien tai:

- schema tach nho cho object con neu can
- `timestamps: true` o model can theo doi thoi gian
- relation dung `ref`
- aggregate business field nhu `unreadCounts`, `seenBy`, `lastMessage` dat ngay trong conversation
- notification luu `recipient`, `type`, `title`, `message`, `actor`, `read`, `friendRequestId`, `conversationId`, `hiddenForRecipient`
- friend request co them `hiddenBySender` de phuc vu xoa mem tab da gui
- message co the luu `content`, `imgUrl`, `mediaType`, `fileName`, `fileSize`

Quy tac mo rong:

- neu them collection moi, can xac dinh ro:
  - entity chinh la gi
  - relation voi user/conversation/message ra sao
  - co can index khong
- can xem xet ky khi them field co the lam trung lap du lieu voi field da co

### 10.4 Socket.IO

Pattern hien tai:

- server socket khoi tao trong `backend/src/socket/index.js`
- user join room theo `user._id`
- user cung join tat ca room conversation cua minh
- client cung co the `join-conversation` va `leave-conversation`
- event dang co: `online-users`, `new-message`, `read-message`, `new-group`, `conversation-updated`, `new-notification`, `conversation-removed`

Quy tac mo rong:

- event name phai on dinh, co nghia nghiep vu ro rang
- payload event phai theo contract ro rang, tranh doi shape dot ngot
- moi thay doi event socket can kiem tra dong thoi backend emit va frontend listener

## 11. Hop dong du lieu va kieu du lieu

Frontend da co type trung tam trong `src/types/`.

Quy tac:

- neu backend response thay doi, cap nhat type frontend cung luc
- khong de component tu suy dien shape response ad-hoc
- uu tien dinh nghia type tai `types/` thay vi lap lai inline nhieu noi

Mot so contract moi can luu y:

- user search API hien tra ve `{ users: User[] }`, khong con la `{ user }`
- notification API tra ve `{ notifications, unreadCount }`
- unfriend API tra ve `{ message, deletedConversationId }`
- socket `conversation-removed` tra ve `{ conversationId }` de client xoa direct chat khoi state ngay lap tuc

Hop dong quan trong da co:

- `Conversation`
- `Message`
- `Group`
- `Participant`
- `SeenUserRef`
- `User`
- `AuthState`
- `ChatState`
- `FriendState`
- `SocketState`

## 12. Bien moi truong va cau hinh

### Frontend env

Bien duoc code su dung:

- `VITE_API_URL`
- `VITE_SOCKET_URL`

### Backend env

Bien duoc code su dung:

- `PORT`
- `CLIENT_URL`
- `ACCESS_TOKEN_SECRET`
- `MONGODB_CONNECTIONSTRING`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Quy tac:

- khong hard-code URL, secret, key trong code
- neu them env moi, cap nhat tai lieu nay va file mau `.env.example` neu sau nay tao them
- dat ten env ro nghia va theo motif hien tai

## 13. Lenh chay du an

### Frontend

```bash
npm install
npm run dev
npm run build
npm run lint
```

### Backend

```bash
npm install
npm run dev
npm start
```

Swagger UI duoc mount tai:

```text
/api-docs
```

## 14. Quy uoc phan hoi API

Pattern response hien tai thuong la:

- success:
  - `{ user }`
  - `{ conversation }`
  - `{ conversations }`
  - `{ message }`
  - `{ accessToken }`
- error:
  - `{ message: "..." }`

Khuyen nghi de tranh xung dot ve sau:

- giu response shape on dinh trong tung module
- khong doi ten key response neu khong can thiet
- neu can bo sung metadata, them key moi theo cach backward-compatible

## 15. Quy uoc comment va ngon ngu

Repo hien tai dang dung comment va text vua Tieng Viet vua Tieng Anh.

Khuyen nghi de nhat quan hon:

- uu tien comment ky thuat bang Tieng Viet ngan gon hoac Tieng Anh ngan gon, nhung khong tron ngau nhien trong cung mot block
- message UI cho end-user co the dung Tieng Viet nhu hien tai
- ten bien, ten ham, ten file van giu bang Tieng Anh

## 16. Nhung diem can than trong repo hien tai

Day la cac diem quan trong can biet de khong lam xau them su bat nhat:

1. `frontend/README.md` hien van la boilerplate Vite, khong phan anh du an thuc te.
2. Swagger hien co mot so path mau chua ID cu the trong du lieu vi du, can cap nhat thanh path tong quat neu sau nay chinh ly docs.
3. Mot so file backend co `// @ts-nocheck`. Khong nen sao chep motif nay sang file moi neu khong co ly do ro rang.
4. Naming file frontend chua hoan toan thong nhat giua kebab-case va PascalCase. Khong nen doi le tung file dang on dinh vi de gay import churn.
5. Event socket `new-group` dang duoc dung cho conversation moi va group moi. Neu muon doi ten event cho dung nghia hon, can doi dong bo ca backend va frontend trong cung mot lan refactor.
6. Repo hien co 2 tai lieu goc phuc vu phat trien: `PROJECT_GUIDE.md` mo ta codebase va `FEATURE_DEVELOPMENT_PLAYBOOK.md` mo ta quy trinh phat trien feature moi.

## 17. Nguyen tac them tinh nang moi ma khong gay xung dot

Bat buoc tuan thu khi phat trien:

1. Xac dinh feature thuoc domain nao: auth, user, friend, chat, socket, profile.
2. Neu can API moi, them theo chuoi `route -> middleware neu can -> controller -> model/query`.
3. Neu frontend can goi API, them vao `service` truoc, sau do expose qua `store` neu la state dung chung.
4. Neu UI chi la presentational, giu component mong va khong goi API truc tiep.
5. Neu can real-time, cap nhat dong thoi emit o backend va listener o frontend.
6. Neu backend response doi, cap nhat type frontend cung luc.
7. Neu them style moi, uu tien token, utility class, primitive component co san.
8. Neu them env moi, cap nhat tai lieu va setup instructions cung luc.
9. Neu can tiep tuc mot feature lon o session moi, doc them `FEATURE_DEVELOPMENT_PLAYBOOK.md` truoc khi sua.

## 18. Checklist truoc khi merge mot feature moi

- da dung dung store/service hien co, khong duplicate logic
- da giu naming dong bo voi khu vuc code dang sua
- da dung `@/` alias o frontend thay vi import sau
- da dung `async/await` va `try/catch` nhat quan
- da co validate input o backend controller
- da cap nhat type frontend neu contract API thay doi
- da kiem tra tac dong len socket events neu feature lien quan den chat
- da giu response JSON shape on dinh
- da giu theme/style theo token va utility class hien co
- da tranh rename/rip-up khong can thiet gay conflict import

## 19. Mau them feature moi

### Backend

1. Tao route moi trong file route domain phu hop.
2. Tao controller function theo motif:

```js
export const exampleHandler = async (req, res) => {
  try {
    const { field } = req.body;

    if (!field) {
      return res.status(400).json({ message: "field la bat buoc" });
    }

    const result = await SomeModel.create({ field });

    return res.status(201).json({ result });
  } catch (error) {
    console.error("Loi khi goi exampleHandler", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};
```

### Frontend

1. Them service method.
2. Them store action neu state dung chung.
3. Them form/component/page.
4. Them type neu response moi.

Mau service:

```ts
async createExample(payload: CreateExamplePayload) {
  const res = await api.post("/examples", payload);
  return res.data;
}
```

Mau store action:

```ts
createExample: async (payload) => {
  try {
    set({ loading: true });
    const data = await exampleService.createExample(payload);
    set({ example: data.result });
  } catch (error) {
    console.error(error);
  } finally {
    set({ loading: false });
  }
},
```

Mau feature flow dang duoc ap dung tot trong repo hien tai:

1. component giu local state nhe va dialog open/close
2. component goi action trong store
3. store goi service
4. service goi API qua `api`
5. backend route/controller xu ly nghiep vu va quyen han
6. neu can, backend emit socket event
7. frontend listener merge lai state conversation/message

## 20. Tieu chuan nhat quan nen ap dung tu bay gio

Neu tiep tuc phat trien du an nay, nen lay cac quy tac sau lam mac dinh:

- frontend moi: TypeScript day du, tach `type`/`interface` ro rang
- backend moi: giu route/controller/model ro trach nhiem
- state dung chung: di qua Zustand store
- call API: di qua service + axios instance chung
- auth: khong tu che co che token moi ngoai flow hien co
- socket: moi event moi phai co ten va payload ro rang
- feature group moi: phai xet dong bo giua participants, unreadCounts, socket room va menu hanh dong group
- feature profile moi: phai xet dong bo giua `useAuthStore`, `useUserStore` va cac noi hien thong tin user
- UI: giu design token, radius, shadow, gradient, utility class dong bo
- naming: tang tinh nhat quan trong tung feature, khong sua tung manh le

## 21. Ket luan

Neu dung dung file nay lam base, moi thay doi trong tuong lai nen duoc xem qua 4 lop sau truoc khi code:

1. feature thuoc domain nao
2. contract API/type co thay doi khong
3. state co can dua vao store khong
4. UI co dang su dung dung token, component va naming convention khong

Nguyen tac lon nhat cua repo nay la: khong them logic moi mot cach le tan. Moi tinh nang nen duoc them vao dung domain, dung lop, dung naming, dung auth flow, dung state flow va dung visual system da co.