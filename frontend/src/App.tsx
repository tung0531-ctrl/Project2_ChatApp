// đang làm giống hệt theo ứng dụng ChatApp nên có một số đoạn không cần thiết phải xóa đi, thêm sửa

import {BrowserRouter, Route, Routes} from 'react-router'
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import ChatAppPage from './pages/ChatAppPage';
import {Toaster} from 'sonner';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return <>
  <Toaster/>
<BrowserRouter>
<Routes>
  {/* public routes*/}
    <Route
      path = '/signin'
      element = {<SignInPage/>}
      />
       <Route
      path = '/signup'
      element = {<SignUpPage/>}
      />
  {/* protect routes*/}
  {/* todo: tạo protected route */}
    <Route element = {<ProtectedRoute />}>
   
    <Route
      path = '/'
      element = {<ChatAppPage/>}
      />
    </Route>
  </Routes>
</BrowserRouter>
  </>
  
};

export default App
