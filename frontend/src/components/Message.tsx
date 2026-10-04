import { useRef } from "react";

interface MessageItem {
  _id: string,
  chatId: string,
  message: string,
  sender: string,
  senderName: string,
//   memberId: string,
  dateAdded: string,
  dateAddedInMs: number,
  myUserId: string
}

function Message({_id, chatId, message, sender, senderName, dateAdded, dateAddedInMs, myUserId}: MessageItem) {

    return(
        <div className="message-item" id={`messageItem-${_id}`} data-chatid={chatId} style={{justifyContent: sender === myUserId ? "flex-end" : "flex-start"}} data-sender={sender}>
          {/* <p className="message-time">{dateAdded}</p> */}
          <div className={`message-body ${sender === myUserId ? "message-body-sent" : "message-body-received"}`}>
            <p style={{fontSize: "0.8em"}}>{message}</p>
            <p style={{fontSize: "0.6em", color: "gray", fontStyle: "italic"}}>{new Date(dateAddedInMs).toLocaleTimeString()}</p>
            <div className={`${sender === myUserId ? "message-triangle-sent" : "message-triangle-received"}`}></div>
          </div>
        </div>
    )
}

export default Message