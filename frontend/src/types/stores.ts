/* useAuthStore là nơi giao diện tương tác, logic với các đối tượng, hàm.
sau đó các đối tượng, hàm này sẽ thực sự gửi api, tương tác với backend tại AuthService.*/
/*Lý do tại sao lại có file types này: TypeScript yêu cầu phải khai báo kiểu dữ liệu đầy đủ cho mọi thứ. Và file này giúp tách riêng phần đó ra cho đỡ rối, dễ quản lí. 
Nếu sau này API thay đổi, chỉ cần sửa trên authService. Nếu frontend thay đổi cách dùng state, chỉ cần sửa file types này.*/ 


import type { User } from "./user";

export interface AuthState {
    accessToken: string | null;
    user: User | null;
    loading: boolean;

    setAccessToken: (accessToken: string) => void;
    
    clearState: () => void;

    signUp: (
        username: string,
        password: string,
        email: string,
        firstName: string,
        lastName: string
    ) => Promise <void>;

    signIn: (username: string,
             password: string)
              => Promise<void>;

    signOut: () => Promise<void>;
    fetchMe: () => Promise<void>;
    refresh: () => Promise<void>;
}