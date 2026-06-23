# ChatApp Feature Development Playbook

## 1. Muc dich tai lieu

Tai lieu nay la huong dan thuc chien de phat trien tinh nang moi trong du an ChatApp ma van giu duoc:

- dung kien truc hien tai cua repo
- dong bo giua frontend, backend, state va socket
- code gon, de mo rong, de debug
- trai nghiem nguoi dung nhat quan
- kha nang validate nhanh sau moi thay doi

Tai lieu nay nen duoc dung khi bat dau mot session moi de tranh mat context va tranh sua tinh nang theo kieu chua du flow.

## 2. Nguyen tac phat trien can giu

1. Khong sua UI mot cach doc lap voi du lieu that.
2. Moi tinh nang co data moi hoac quyen moi thuong phai di theo full flow: model -> controller -> route -> service -> store -> component.
3. Uu tien sua dung cho quyet dinh nghiep vu, khong va tam o lop render.
4. Neu mot thay doi anh huong real-time, phai xet them socket event va cach state frontend duoc cap nhat.
5. Neu mot tinh nang co quyen han, backend phai la noi xac thuc cuoi cung. Frontend chi la lop hien thi va chan UX som.
6. Sau edit dau tien, phai validate ngay bang check hep nhat co the.

## 3. Kien truc can ton trong

### Frontend

- `components/`: hien thi UI va xu ly interaction nhe.
- `services/`: chi goi API, khong chua state UI.
- `stores/`: dieu phoi logic client, cap nhat state, goi service, hien toast.
- `types/`: contract TypeScript dung chung.
- `lib/axios.ts`: auth header, refresh token, retry.

### Backend

- `models/`: mo ta du lieu MongoDB.
- `controllers/`: nghiep vu chinh.
- `routes/`: map endpoint sang controller.
- `middlewares/`: auth, validate trung gian, permission check.
- `utils/`: helper nghiep vu dung lai.
- `socket/`: join room, emit event real-time.

## 4. Quy trinh lam mot feature moi

Dung quy trinh sau thay vi sua ngau hung:

### Buoc 1. Chot diem neo tinh nang

Truoc khi sua, phai xac dinh ro feature dang duoc dieu khien boi file nao:

- UI bat dau tu component nao
- store nao quan ly state
- service nao goi API
- route/controller nao xu ly nghiep vu
- model nao luu du lieu
- co can socket hay khong

Vi du:

- sua profile: `PersonalInfoForm` -> `useUserStore` -> `userService` -> `userController`
- roi nhom: `GroupChatActions` -> `useChatStore` -> `chatService` -> `conversationController`
- sua mo ta nhom: `GroupInfoDialog` -> `useChatStore` -> `chatService` -> `conversationController`

### Buoc 2. Viet gia thuyet local

Truoc khi edit, can viet trong dau mot gia thuyet cu the:

- tinh nang dang thieu o dau
- du lieu nao chua du
- UI dang dung sai logic nao
- backend dang thieu validate hay thieu endpoint nao

Vi du:

- neu UI co nut nhung bam khong co tac dung, kha nang cao dang thieu service/store hoac route/controller
- neu UI khong hien dung quyen, kha nang cao la so sanh id sai kieu du lieu
- neu group van nhan thong bao sau khi roi, kha nang cao la socket room hoac participants chua duoc cap nhat dung cach

### Buoc 3. Them du lieu truoc neu can

Neu tinh nang can field moi thi phai them tu duoi len:

1. model/schema backend
2. du lieu format tra ve
3. type frontend
4. UI render

Khong nen lam nguoc lai.

Vi du:

- them `group.description` truoc o `Conversation` model
- sau do moi hien no trong `GroupInfoDialog`

### Buoc 4. Noi full flow

Tinh nang chuan trong repo nay nen di theo flow sau:

1. backend route/controller hoac middleware neu can
2. service frontend
3. store frontend
4. component UI
5. socket update neu feature co anh huong real-time

Neu bo qua store va cho component goi API truc tiep, code se lech phong cach hien tai cua repo.

## 5. Cach chia trach nhiem dung

### Component nen lam gi

- render UI
- giu local state nho, tam thoi
- xu ly modal open/close
- xu ly input field va submit event

### Component khong nen lam gi

- khong goi thang API bang axios
- khong chua logic nghiep vu lon
- khong tu y sua state toan cuc ngoai store

### Store nen lam gi

- goi service
- cap nhat state
- xu ly optimistic update nhe neu hop ly
- toast success/error
- dong bo socket neu can

### Service nen lam gi

- goi dung endpoint
- tra du lieu da duoc tach tu `res.data`
- khong toast
- khong cap nhat UI

### Controller nen lam gi

- validate input
- check quyen
- xu ly nghiep vu
- luu DB
- emit socket neu can
- tra response ro rang

## 6. Mau trien khai cho feature CRUD nho

Neu can them mot tinh nang nhu:

- doi ten
- cap nhat mo ta
- roi nhom
- tham gia nhom
- doi mat khau

thi mau trien khai nen la:

1. Them controller moi hoac mo rong controller cu.
2. Them route ro rang theo resource.
3. Them service method moi.
4. Them store method moi.
5. Component goi store method do.
6. Neu du lieu hien o nhieu noi, emit socket event cap nhat.

## 7. Quy tac dat ten endpoint

Co the bam sat cac mau da dung trong repo:

- `PATCH /users/me`
- `PATCH /users/security`
- `PATCH /conversations/:conversationId/leave`
- `PATCH /conversations/:conversationId/description`
- `GET /conversations/groups/search?name=...`
- `PATCH /conversations/:conversationId/join`

Nguyen tac:

- hanh vi tren chinh resource thi uu tien `PATCH`
- tim kiem thi dung `GET` + query string
- ten endpoint phai doc vao la hieu nghiep vu

## 8. Quy tac cho real-time

Neu feature thay doi du lieu dang hien o nhieu client, phai xet socket.

Checklist:

1. Sau khi luu DB, co can emit event khong?
2. Client nao can nhan event do?
3. Client co can `join-conversation` hay `leave-conversation` khong?
4. Store frontend da co `socket.on(...)` de merge state chua?

Mau dang dung trong repo:

- `new-message`
- `read-message`
- `new-group`
- `conversation-updated`

Neu feature sua metadata conversation, uu tien tai su dung `conversation-updated` thay vi tao qua nhieu event moi.

## 9. Quy tac ve quyen han

Repo nay co nhieu tinh nang can quyen han, vi vay luon kiem tra ca 2 phia:

### Frontend

- an nut hoac doi UI neu user khong co quyen
- khong hien input edit neu user khong du dieu kien

### Backend

- phai tu check quyen lai mot lan nua
- khong tin frontend

Vi du:

- chi truong nhom moi duoc sua mo ta nhom
- user muon doi mat khau phai xac thuc bang mat khau cu
- user roi nhom phai thuc su nam trong `participants`

## 10. Cach lam modal va dialog dung phong cach hien tai

Repo nay dang dung shadcn/ui + Radix wrappers.

Khi tao dialog moi:

1. Dat component trong dung feature folder.
2. Dung `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`.
3. Form state nho co the dung `useState` neu don gian.
4. Neu chi can mot hanh vi ngan, khong can dua het vao `react-hook-form`.

Vi du trong repo:

- `AddFriendModal`
- `NewGroupChatModal`
- `GroupInfoDialog`

## 11. Cach lam search/filter theo kieu hien tai

Neu can mot luong search theo chuoi go vao, uu tien cach sau:

1. local state giu `keyword`
2. `useEffect` theo doi `keyword`
3. debounce ngan `200ms`
4. neu `keyword.trim()` rong thi clear ket qua
5. neu co ket qua thi render danh sach card chon
6. user chon xong moi sang buoc confirm

Tinh huong phu hop:

- tim user de ket ban
- tim group de tham gia
- loc danh sach moi thanh vien trong group

## 12. Validation can co sau moi thay doi

Moi feature moi nen theo thu tu validate sau:

1. `get_errors` cho cac file vua sua
2. build frontend neu co dong vao TypeScript/UI
3. neu co backend logic lon, can it nhat doc lai route/controller/model lien quan
4. neu co socket, xet xem state merge co mat field nao khong

Trong repo nay, lenh frontend can dung la:

```powershell
Set-Location "d:\Document_from_C\2025_2\Project 2\Git\frontend"; npm.cmd run build
```

Luu y:

- dung `npm.cmd` thay vi `npm` trong PowerShell neu gap execution policy

## 13. Checklist truoc khi xem feature la xong

Mot feature duoc xem la xong khi:

- co UI thuc su dung duoc
- co API/backend nghiep vu tuong ung
- store va service da noi full flow
- quyen han da duoc check
- state da duoc cap nhat dung sau thao tac
- neu can, socket da dong bo
- build frontend pass
- khong co editor errors tren cac file vua sua

## 14. Sai lam can tranh

1. Chi them UI ma khong them controller/store/service.
2. Chi check quyen o frontend ma khong check o backend.
3. Them field moi o UI nhung quen cap nhat type.
4. Luu DB xong nhung quen emit socket hoac quen merge state.
5. Sua mot tinh nang chat nhung khong xet unread/seen/conversation metadata.
6. Soft-delete hay soft-leave theo kieu tam bo ma khong ro user story can gi.
7. Khong validate ngay sau khi patch.

## 15. Cach tiep can mot feature lon trong session moi

Khi vao session moi, nen theo mau sau:

1. Doc `PROJECT_GUIDE.md` de nho kien truc tong the.
2. Doc tai lieu nay de nho cach lam feature.
3. Xac dinh file neo cua feature can sua.
4. Doc dung 3-6 file sat nghiep vu, khong map rong ca repo.
5. Viet ra gia thuyet local.
6. Patch nho nhat de noi du flow.
7. Validate ngay.
8. Neu co follow-up UI/UX thi moi mo rong tiep.

## 16. Cac feature da la mau tham khao tot trong repo

Neu muon hoc cach noi full flow theo kieu dung cua repo, co the nhin vao cac nhom feature sau:

- cap nhat profile user
- doi tai khoan va mat khau
- hien thi seen avatars
- roi nhom chat
- xem thong tin nhom
- sua mo ta nhom
- tham gia nhom chat bang ten nhom

Day la cac feature da can den:

- component UI
- service/store
- backend route/controller
- permission check
- state sync
- mot so truong hop co socket update

## 17. Handoff rieng cho session AI bot tiep theo

Neu session tiep theo tiep tuc feature AI bot, nen vao theo thu tu sau thay vi doc lai rong ca repo:

1. `AI_BOT_EXPERT_SYSTEM_PLAN.md`
2. `backend/src/ai/services/botService.js`
3. `backend/src/ai/engines/expertBotEngine.js`
4. `backend/src/controllers/messageController.js`
5. `frontend/src/components/chat/MessageInput.tsx`
6. `frontend/src/components/chat/GroupInfoDialog.tsx`

Nhung diem da on dinh can giu nguyen:

- 1 engine chung, nhieu bot definitions
- bot chi tra loi khi bi mention dung trigger co dinh
- toi da 1 bot cho 1 message
- group owner la nguoi duy nhat duoc bat/tat bot
- bot reply di qua dung message flow hien tai, khong lam luong rieng
- mention UI dang dua tren textarea overlay + mention parser chung

Nhung diem can nho khi mo rong:

- neu them bot moi, uu tien them JSON bot pack truoc khi sua engine
- neu them tri thuc moi cho botGame, sua `entities`, `examples`, `rules`, `responses` truoc
- voi classifier hien tai, neu them intent moi thi nen them ca examples gan exact user phrasing va examples paraphrase de lop TF-IDF + Naive Bayes + similarity rerank co diem tua tot hon
- neu thay doi payload message, phai cap nhat dong bo `Message`, `Conversation.lastMessage`, socket merge va TS types
- neu sua mention UX, phai test ca light mode, dark mode, own bubble va received bubble

Validation hep nen uu tien cho nhanh:

1. `get_errors` tren cac file vua sua
2. frontend build neu dong vao TypeScript/UI
3. backend import check hoac route/controller check neu dong vao engine/message flow
4. runtime test bang group message co mention trigger neu sua logic bot
5. neu sua `botGame.json`, uu tien test mot lo paraphrase nho cho bot info, hero, esports va patch de bat som cac intent bi roi duoi threshold

## 18. Ket luan

Neu muon phat trien tinh nang moi trong ChatApp theo cach dong bo va ben vung, hay giu mot nguyen tac rat don gian:

"Khong lam mot feature chi o mot lop. Moi thay doi nghiep vu phai di tron tu du lieu, API, state den UI, va phai validate ngay sau khi sua." 

Neu bat dau mot session moi, hay dung tai lieu nay nhu checklist thao tac truoc khi code.