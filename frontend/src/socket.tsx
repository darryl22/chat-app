import { io, Socket } from "socket.io-client";

const URL = 'http://localhost:3000'
// const URL = 'https://a25a-2001-4958-3c36-2b01-9c9-4351-e043-8b3d.ngrok-free.app'
// const URL = import.meta.env.VITE_BACKEND_URL
export const socket: Socket = io(URL, {
    autoConnect: false,
    withCredentials: true,
    extraHeaders: {
        // ngrok header to skip tunnel warning page
        "ngrok-skip-browser-warning": "true"
    }
})