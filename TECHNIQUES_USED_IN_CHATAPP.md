# Cac ky thuat duoc su dung trong ChatApp va cach code hien tai xu ly

## 1. Muc dich tai lieu

Tai lieu nay mo ta cac ky thuat chinh duoc su dung trong bai ChatApp theo 2 lop:

- Khai niem ky thuat la gi.
- Code cua du an dang xu ly ky thuat do nhu the nao.

Noi dung duoc tong hop truc tiep tu source hien tai trong repo, khong viet theo ly thuyet chung chung.

## 2. CRUD API de them, doc, sua, xoa du lieu trong database

### 2.1. Khai niem

CRUD la viet tat cua 4 thao tac co ban khi lam viec voi du lieu:

- Create: tao du lieu moi.
- Read: doc du lieu tu he thong.
- Update: cap nhat du lieu da co.
- Delete: xoa du lieu.

Trong web app, CRUD thuong duoc to chuc qua REST API. Frontend gui request HTTP, backend nhan request, validate, thao tac voi database va tra JSON response.

### 2.2. Code cua du an xu ly nhu the nao

Du an tach backend theo flow:

1. `routes` dinh nghia endpoint.
2. `middlewares` xu ly xac thuc va dieu kien phu.
3. `controllers` chua nghiep vu.
4. `models` thao tac voi MongoDB thong qua Mongoose.

Mot so vi du CRUD ro nhat trong repo:

| CRUD | Cach ap dung trong du an | Vi du code hien tai |
| --- | --- | --- |
| Create | Tao moi user, session, conversation, message, friend request | `authController.signUp`, `authController.signIn` tao `Session`, `createConversation`, `sendDirectMessage`, `sendGroupMessage` |
| Read | Lay user hien tai, tim user, lay danh sach conversation, lich su tin nhan | `authMe`, `searchUserByUsername`, `getConversations`, `getMessages` |
| Update | Sua profile, sua mo ta nhom, danh dau da xem, bat/tat bot, bat/tat join approval | `updateMyProfile`, `updateGroupDescription`, `markAsSeen`, `updateGroupBots`, `updateGroupJoinApproval` |
| Delete | Xoa session khi logout, huy ket ban, xoa direct conversation cu, xoa mem loi moi | `Session.deleteOne`, `Friend.findOneAndDelete`, `Message.deleteMany`, `Conversation.deleteOne`, `hiddenBySender = true` |

### 2.3. Diem cu the trong source

#### Create

- Khi dang ky, backend nhan du lieu tu form, kiem tra username trung, hash password bang `bcrypt`, sau do `User.create(...)`.
- Khi dang nhap thanh cong, backend tao them 1 session moi bang `Session.create(...)` de luu refresh token.
- Khi tao chat moi hoac gui tin nhan, controller tao document moi trong `Conversation` hoac `Message`.

#### Read

- `authMe` doc user tu `req.user` sau khi da qua `protectedRoute`.
- `getConversations` doc toan bo hoi thoai co user hien tai trong mang `participants`.
- `getMessages` doc lich su tin nhan theo `conversationId`.
- `searchUserByUsername` doc user theo dieu kien tim kiem gan dung bang regex.

#### Update

- `updateMyProfile` dung `$set` va `$unset` de sua profile ma khong can ghi de toan bo document.
- `markAsSeen` cap nhat trang thai da xem cho conversation.
- `updateGroupDescription`, `updateGroupBots`, `updateGroupJoinApproval` cap nhat tung phan cua group settings.

#### Delete

- Logout xoa session bang `Session.deleteOne({ refreshToken: token })`.
- `unfriend` xoa ban ghi quan he ban be, sau do xoa toan bo direct messages va direct conversation lien quan.
- Loi moi ket ban da gui khong phai luc nao cung hard-delete, ma co truong hop xoa mem bang cach set `hiddenBySender = true`.

### 2.4. Nhan xet ky thuat

CRUD trong bai nay khong chi la goi 4 lenh co ban. No duoc dat trong kien truc phan lop ro rang, giup code de doc, de mo rong va tranh viet logic database truc tiep trong component frontend.

## 3. JWT ket hop Session de quan ly route va xac thuc

### 3.1. Khai niem

JWT la token dung de xac thuc nguoi dung ma khong can luu trang thai truy cap o server cho moi request.

Tuy nhien, neu chi dung JWT thuan tuy thi viec thu hoi phien, refresh token va quan ly dang nhap dai han se kho hon. Vi vay he thong nay dung mo hinh hybrid:

- Access token: JWT song ngan, gui kem moi request private.
- Refresh token: luu trong cookie va duoc lien ket voi 1 session trong database.

Day la cach ket hop uu diem cua JWT va session-based auth.

### 3.2. Code cua du an xu ly nhu the nao

#### Buoc 1: Dang nhap

Trong `backend/src/controllers/authController.js`:

- Backend kiem tra username va password.
- Password duoc so sanh bang `bcrypt.compare(...)`.
- Neu hop le, backend tao `accessToken` bang `jwt.sign(...)` voi TTL `30m`.
- Backend tao `refreshToken` ngau nhien bang `crypto.randomBytes(...)`.
- Refresh token khong dua vao JWT ma duoc luu trong collection `Session` cung `userId` va `expiresAt`.

Nghia la phien dang nhap dai han cua bai nay duoc quan ly bang database, khong chi bang token tu phat.

#### Buoc 2: Luu refresh token an toan

Refresh token duoc tra ve qua cookie voi cac thuoc tinh:

- `httpOnly: true`
- `secure: true`
- `sameSite: "none"`

Muc tieu la giam rui ro frontend JS doc truc tiep refresh token, dong thoi ho tro mo hinh frontend va backend deploy tach domain.

#### Buoc 3: Bao ve route private

Trong `backend/src/server.js`, he thong mount theo thu tu:

1. `/api/auth` la public route.
2. Sau do `app.use(protectedRoute)`.
3. Toan bo `/api/users`, `/api/friends`, `/api/messages`, `/api/conversations`, `/api/notifications` deu di qua middleware nay.

Trong `backend/src/middlewares/authMiddleware.js`:

- Middleware lay token tu header `Authorization: Bearer <token>`.
- Dung `jwt.verify(...)` de xac minh.
- Neu hop le, backend tim `User` theo `decodedUser.userId`.
- User duoc gan vao `req.user` de controller sau dung lai.

Nhu vay, route protection cua bai nay la middleware-based, khong viet lap lai trong tung controller.

#### Buoc 4: Refresh token khi access token het han

Trong `authController.refreshToken`:

- Backend lay refresh token tu cookie.
- Tim session trong collection `Session`.
- Kiem tra session co ton tai va con han hay khong.
- Neu hop le, tao access token moi.

Trong `backend/src/models/Session.js`, schema co TTL index:

- `sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })`

TTL index giup MongoDB tu dong don session het han.

#### Buoc 5: Frontend tu dong noi lai phien

Trong `frontend/src/lib/axios.ts`:

- Request interceptor tu dong gan `Authorization` neu store dang co `accessToken`.
- Response interceptor bat loi `403`.
- Neu request private bi `403`, frontend goi `refresh()`.
- Neu refresh thanh cong, frontend gan token moi va retry request cu.
- Neu refresh that bai, frontend xoa state dang nhap.

Trong `frontend/src/stores/useAuthStore.ts`:

- `accessToken` va `user` duoc persist vao `sessionStorage`.
- State auth chi ton tai trong phien tab/trinh duyet hien tai.
- Store co them check `AUTH_USER_MISMATCH` de tranh tinh huong refresh nham sang tai khoan khac trong cung trinh duyet.

### 3.3. Ket luan ky thuat auth

Du an khong dung JWT theo kieu thuan tuy stateless. No dung JWT ngan han cho request nhanh, va dung session trong DB de giu refresh token va kiem soat phien. Day la cach lam hop ly cho ung dung chat can dang nhap dai han nhung van muon route private an toan.

## 4. Chat truc tuyen bang Socket.IO

### 4.1. Khai niem

Socket.IO cho phep client va server giao tiep 2 chieu theo thoi gian thuc. Khac voi HTTP thong thuong la request-response, socket cho phep server chu dong day su kien moi cho client.

No rat phu hop voi bai toan chat vi can:

- nhan tin moi ngay lap tuc
- cap nhat online/offline
- dong bo da xem tin nhan
- dong bo thong bao va thay doi conversation

### 4.2. Code cua du an xu ly nhu the nao

#### Xac thuc socket

Trong `frontend/src/stores/useSocketStore.ts`:

- Frontend ket noi bang `io(baseURL, { auth: { token: accessToken }, transports: ["websocket"] })`.

Trong `backend/src/middlewares/socketMiddleware.js`:

- Backend doc `socket.handshake.auth.token`.
- Dung `jwt.verify(...)` de xac minh.
- Tim user trong DB va gan vao `socket.user`.

Nghia la socket cung duoc bao ve bang cung mot co che auth nhu API private.

#### Quan ly online users

Trong `backend/src/socket/index.js`:

- Server luu user dang online trong `Map` ten `onlineUsers`.
- Khi co ket noi moi, server them `user._id -> socket.id`.
- Khi disconnect, server xoa khoi map.
- Sau moi thay doi, server emit `online-users` cho tat ca client.

Frontend lang nghe `online-users` de cap nhat danh sach user dang online trong store.

#### Room-based realtime

Server dang dung 2 loai room:

- Room theo `conversationId`: de gui su kien cho tung hoi thoai.
- Room theo `userId`: de gui su kien rieng cho 1 nguoi dung.

Khi connect, backend tu dong:

- Lay danh sach hoi thoai cua user bang `getUserConversationsForSocketIO(...)`.
- `socket.join(...)` vao tung room conversation.
- Join them room ca nhan theo `user._id.toString()`.

Frontend cung chu dong emit:

- `join-conversation` khi vua tao chat moi hoac vua tham gia nhom.
- `leave-conversation` khi roi nhom hoac khong con la participant.

#### Dong bo su kien chat

Client dang lang nghe cac su kien realtime chinh sau:

- `online-users`
- `new-message`
- `message-reaction-updated`
- `read-message`
- `new-group`
- `new-notification`
- `conversation-removed`
- `conversation-updated`

Moi khi nhan event, `useSocketStore` khong render truc tiep ma goi sang `useChatStore`, `useNotificationStore`, `useFriendStore` de cap nhat state ung dung. Cach nay giu cho realtime flow va state management thong nhat voi nhau.

### 4.3. Y nghia ky thuat

ChatApp khong dung polling de lap lai goi API lien tuc. Thay vao do, socket giup tiet kiem request va cho cam giac chat thoi gian thuc dung nghia.

## 5. Query, filter, sort va pagination dang dung ky thuat nao

### 5.1. Khai niem

Day la nhom ky thuat dung de lay dung du lieu can hien thi, dung thu tu va dung so luong:

- Query: chon tap du lieu.
- Filter: loc theo dieu kien.
- Sort: sap xep du lieu.
- Pagination: chia du lieu thanh tung dot de tai dan.

### 5.2. Du an nay dang dung gi

#### Tim kiem text: Regex matching

Du an hien tai khong tu cai dat cac thuat toan tim chuoi nhu KMP hay Boyer-Moore. O muc ung dung, phan tim kiem dang dung:

- MongoDB query voi `$regex`
- tuy chon `$options: "i"` de khong phan biet chu hoa thuong

Vi du:

- `searchUserByUsername` tim `username` gan dung
- `searchJoinableGroups` tim ten nhom theo tu khoa

Day la kieu substring matching dua tren regex, de dung va phu hop voi bai toan search nho-trung binh.

#### Filter du lieu: MongoDB operators

He thong dung cac toan tu truy van cua MongoDB/Mongoose nhu:

- `$ne`: loai bo chinh user hien tai
- `$or`: chap nhan nhieu dieu kien account type
- `$not` + `$elemMatch`: loc nhung group ma user chua tham gia va chua gui yeu cau tham gia
- `$lt`: lay message cu hon moc `cursor`

Vi du trong `searchJoinableGroups`, backend cung luc loc duoc:

- phai la group
- ten group phu hop keyword
- user hien tai chua la thanh vien
- user hien tai chua nam trong `pendingJoinRequests`

#### Sort du lieu: MongoDB sort + client-side sort

Phan lon sap xep o backend dang dung `MongoDB sort` thong qua Mongoose:

- `getConversations`: `.sort({ lastMessageAt: -1, updatedAt: -1 })`
- `getMessages`: `.sort({ createdAt: -1 })`
- `searchJoinableGroups`: `.sort({ updatedAt: -1 })`

O frontend, `useChatStore` co them `sortConversationsByLatestActivity(...)` de sap xep lai danh sach conversation theo timestamp moi nhat. Ham nay dung `Array.sort(...)` cua JavaScript voi comparator dua tren `lastMessage.createdAt`, `lastMessageAt`, hoac `updatedAt`.

Nghia la o muc code ung dung, nhom khong tu viet quicksort hay mergesort. He thong tan dung bo sap xep co san cua MongoDB va JavaScript runtime.

#### Pagination: Cursor-based pagination

`getMessages` dang dung pagination theo cursor, khong dung `skip/limit` offset truyen thong.

Flow cu the:

1. Client gui `limit` va `cursor`.
2. Backend query theo `conversationId`.
3. Neu co `cursor`, them dieu kien `createdAt: { $lt: new Date(cursor) }`.
4. Backend lay `limit + 1` ban ghi.
5. Neu du so luong, tach ban ghi cuoi lam dau hieu cho `nextCursor`.
6. Sau do `reverse()` de frontend nhan ve thu tu tin nhan tang dan theo thoi gian.

Cursor pagination phu hop voi chat hon vi:

- on dinh khi co tin nhan moi chen vao
- tranh lech trang nhu offset pagination
- de tai them lich su cu

#### Toi uu response: select, lean, populate

Ngoai query/sort/filter, code con dung cac ky thuat de giam tai va dung hinh response:

- `.select(...)`: chi lay truong can thiet
- `.lean()`: tra plain object khi khong can document day du
- `.populate(...)`: no reference tu MongoDB de frontend nhan du user/message info can hien thi

### 5.3. Ket luan phan truy van

Neu hoi "query, sort, filter bang thuat toan gi" thi cau tra loi dung voi repo nay la:

- Tim kiem text: regex substring matching cua MongoDB.
- Loc du lieu: MongoDB query operators.
- Sap xep: MongoDB `.sort(...)` o backend va `Array.sort(...)` o frontend.
- Chia trang message: cursor-based pagination theo `createdAt`.

## 6. Quan ly state va tang service o frontend

### 6.1. Khai niem

Frontend khong nen de component vua render UI vua tu goi API va tu giai quyet toan bo nghiep vu. Vi vay bai nay tach thanh:

- `components/pages`: giao dien
- `services`: goi API
- `stores`: giu state va dieu phoi nghiep vu

### 6.2. Code cua du an xu ly nhu the nao

- `frontend/src/services/*` chua HTTP request wrappers.
- `frontend/src/stores/useAuthStore.ts` quan ly auth flow.
- `frontend/src/stores/useChatStore.ts` quan ly conversations, messages, join/leave, reactions, group settings.
- `frontend/src/stores/useSocketStore.ts` chi chuyen su kien realtime vao cac store nghiep vu.

Cach tach nay giup code de test hon, de sua hon va han che viec nhieu component cung viet lai cung mot logic.

## 7. Ky thuat AI bot dang co trong bai

### 7.1. Khai niem

Ngoai chat co ban, du an con co nhom ky thuat AI bot theo huong hybrid expert system. Nghia la khong dung LLM, ma ket hop:

- TF-IDF de vector hoa tu va cau
- Naive Bayes de phan loai intent
- Forward chaining de suy dien rule

### 7.2. Code cua du an xu ly nhu the nao

Trong `backend/src/ai/engines`:

- `tfidfVectorizer.js`: bien doi text thanh vector trong so
- `naiveBayes.js`: tinh xac suat va xep hang intent theo do tin cay
- `forwardChaining.js`: chay tap luat neu dieu kien duoc thoa
- `expertBotEngine.js`: ghep cac buoc classify, match entity, rank ket qua va tao dap an

Trong `backend/src/ai/services/botService.js`:

- Backend kiem tra message co mention dung bot hay khong
- Kiem tra group da bat bot do chua
- Lay recent context de giam tra loi lac de
- Neu engine tra ket qua hop le, backend luu bot reply nhu 1 `Message` that va emit realtime nhu message thuong

Nghia la AI trong bai nay la AI theo luat + thong ke co kiem soat, phu hop voi de tai expert system.

## 8. Tong ket

Ve mat ky thuat, ChatApp hien tai duoc xay dung tren 4 tru cot chinh:

1. CRUD API theo kien truc route -> middleware -> controller -> model.
2. JWT + Session de xac thuc va bao ve route private.
3. Socket.IO de chat va dong bo realtime.
4. MongoDB query operators + sort + cursor pagination de lay du lieu hieu qua.

Ngoai ra, du an con co tang state frontend tach rieng va 1 cum AI bot expert-system de mo rong gia tri ky thuat cua bai.