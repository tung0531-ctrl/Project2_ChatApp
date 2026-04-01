//viết trong authService thì khai báo ở trong State, rồi đến làm phần ở trong store

import api from '@/lib/axios';

export const authService = {
    signUp: async (
        username: string,
        password: string,
        email: string,
        firstName: string,
        lastName: string
    ) => {
        const res = await api.post(
            "/auth/signup",
            { username, password, email, firstName, lastName},
            {withCredentials: true }

        );

        return res.data;
    },
    signIn: async (
        username: string,
        password: string) => {
            const res = await api.post( 
                "/auth/signin",
                { username, password}, 
                {withCredentials: true }
            );
                
                return res.data; //acess token
            },
            signOut: async () => {
                return api.post('/auth/signout', {},{withCredentials: true});
            },
  
    fetchMe: async () => {
        const res = await api. get("/users/me", {withCredentials: true});
        return res.data;//đoạn này là res.data chứ không .user nữa vì dữ liệu BE của mình trả về không giống định dạng vid mẫu
    },
    
    refresh: async () => {
        const res = await api.post ("/auth/refresh",{}, {withCredentials: true});
        return res.data.accessToken;
    },
};

