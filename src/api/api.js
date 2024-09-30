import axios from "axios";
import { getCookie, removeCookie, setCookie } from "../utils/cookieUtil";


const api = axios.create({
    baseURL: `${process.env.REACT_APP_REST_SERVER}`,
    withCredentials: true                               // HttpOnly 쿠키 속성으로 저장된 refreshToken 전송한다.
});

api.interceptors.request.use(
    (config) => {
        // token 관련 내용
        const token = getCookie("accessToken");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            delete config.headers.Authorization;
        }
        return config;
    },
    (err) => {
        return Promise.reject(err);
    }
);

api.interceptors.response.use(
    (res) => {
        return res;
    },
    async (err) => {
        // 원래 403으로 실패했던 요청
        const originalReq = err.config;
        // 403 에러 처리
        if (err.response.status == 403 && !originalReq._retry) {
            // 만약에 권한이 없다는 에러가 나오면
            try {
                // 토큰 재발급 해주도록 할 것이다.
                const response = await refreshTokenHandler();
                // 정상 재발급 시
                if (response.status === 200) {
                    // token값 로컬스토리지에 저장
                    // localStorage.setItem("token", response.data.accessToken);               // 토큰 재발급
                    // token 값 쿠키에 저장
                    setCookie("accessToken", response.data.accessToken);

                    originalReq.headers.Authorization = `Bearer ${response.data.accessToken}`;
                    // 실패했던 요청 다시 보내기
                    return api.request(originalReq);
                }
            } catch (error) {
                console.log("토큰 재발급 실패");
                removeCookie("accessToken");
                window.location.href = "/login";
            }
        }
        return Promise.reject(err);
    }
);

const refreshTokenHandler = async () => {
    try {
        if (getCookie("accessToken")) {
            const response = await api.post("/auth/refresh-token");
            return response;
        }
    } catch (error) {
        throw error;
    }
}

export default api;