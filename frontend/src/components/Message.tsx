import { useState, useRef, useEffect, useContext } from "react";
import { MainContext } from '../context/MainContext'
import type { MessageItem } from "../TsAssets";
// import optionLight from "../assets/logos/optionsLight.svg"
import option from "../assets/logos/options.svg"
import filePdf from "../assets/logos/filePdf.svg"


function Message({_id, chatId, message, sender, dateAddedInMs, myUserId, showReply, messageType, replyId, replyMessage, messagesRef, jumpToReply, replyMessageMs, fileName, fileId, fileSize}: MessageItem) {

  const [showOptions, setShowOptions] = useState(false)
  const optionRef = useRef<HTMLImageElement | null>(null)
  const toggleOptionClickController = useRef<AbortController | undefined>(undefined)
  const toggleOptionClickSignal = useRef<AbortSignal | undefined>(undefined)
  const mainContext = useContext(MainContext)

  useEffect(() => {
    return () => {
      toggleOptionClickController.current?.abort()
    }
  }, [])

  function openOptions() {
    if (!showOptions) {
      setShowOptions(true)
    } else {
      setShowOptions(false)
      toggleOptionClickController.current?.abort()
    }
    console.log("open", showOptions)
    toggleOptionClickController.current = new AbortController()
    toggleOptionClickSignal.current = toggleOptionClickController.current.signal
    document.addEventListener("click", (e) => {
      if (optionRef.current && optionRef.current !== e.target) {
        console.log("option clicked", showOptions)
        toggleOptionClickController.current?.abort()
        setShowOptions(false)
      }
      // setShowOptions(false)
    }, {signal: toggleOptionClickSignal.current})
  }

  function deleteMessage() {
    console.log("delete message")
  }

  function handleJumpToReply() {
    console.log(replyId, replyMessageMs)
    if (jumpToReply && replyId && replyMessageMs) {
      jumpToReply(replyId, replyMessageMs)
    } else {
      console.log("no reply")
    }
  }

  function replyToMessage() {
    let messageShort = message
    if (message.length > 30) {
      messageShort = message.slice(0, 30) + "..."
    }
    if (showReply){
      showReply({
        show: true,
        message: messageShort,
        replyMessageMs: dateAddedInMs,
        replyId: _id,
        replyOriginMessageType: messageType
      })
    }
  }

  async function getFileById(id: string | undefined) {
    try {
      if (id) {
        let fileRes = await fetch("/api/getAttachment", {
          method: "post",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileId: id,
            // fileType: fil
          })
        })
        if (!fileRes.body) {
          return
        }
        console.log(fileRes.status, fileRes.ok)
        if (!fileRes.ok) {
          mainContext?.AddAlert("File not found", "ERROR")
          return
        }
        let chunks = []
        let chunkSize = 0
        let contentType = fileRes.headers.get("Content-Type")

        let fileStream = fileRes.body.getReader()
        while (true) {
          const {value, done} = await fileStream.read()
          if (done) {
            break
          }
          chunks.push(value)
          chunkSize = chunkSize + value.byteLength
          console.log("chunkSize", chunkSize)
          if (fileSize) {
            console.log((chunkSize / fileSize) * 100)
          }
        }
        const fileBlob = new Blob(chunks, {type: contentType ? contentType : ""})
        console.log("to blob", fileBlob)
        const download = URL.createObjectURL(fileBlob)
        window.open(download, "_blank")
        // const link = document.createElement('a');
        // link.href = download;
        // document.body.appendChild(link);
        // link.click();
        // console.log(download)
      } else {
        console.log("id missing")
      }
    } catch(error) {
      console.log(error)
    }
  }

  return(
      <div className="message-item" ref={(node) => {
        if (node) {
          messagesRef?.set(`message-${_id}`, node)
        }
      }} id={`messageItem-${_id}`} data-chatid={chatId} style={{justifyContent: sender === myUserId ? "flex-end" : "flex-start"}} data-sender={sender}>
        {/* <p className="message-time">{dateAdded}</p> */}
        <div className={`message-body ${sender === myUserId ? "message-body-sent" : "message-body-received"}`}>
          <div className="message-option" style={{left: sender === myUserId ? "-15px" : "auto", right: sender === myUserId ? "auto" : "-15px"}}>
            <img ref={optionRef} src={option} alt="message option"  className={`message-option-img ${showOptions ? "persist-show" : ""}`} onClick={openOptions}/>
            <div className="message-option-div" style={{translate: sender === myUserId ? "-90% 10px" : "0% 10px", display: showOptions ? "block" : "none"}}>
              <div className="message-option-item" onClick={replyToMessage}>reply</div>
              <div className="message-option-item" onClick={deleteMessage}>delete</div>
            </div>
          </div>
          <div className="reply-message-div" style={{display: messageType === "reply" ? "block" : "none"}} onClick={handleJumpToReply}>
            <p style={{fontSize: "0.8em"}}>{replyMessage}</p>
          </div>
          <div className="message-file-div" style={{display: messageType === "file" ? "flex" : "none"}}>
            <img src={filePdf} alt="filePdf" style={{height: "2.5em"}}/>
            <p style={{padding: "0em", fontSize: "0.8em"}}>{fileName}</p>
            <button onClick={() => getFileById(fileId)}>download</button>
          </div>
          <p style={{fontSize: "0.8em"}}>{message}</p>
          <p style={{fontSize: "0.6em", color: "gray", fontStyle: "italic"}}>{new Date(dateAddedInMs).toLocaleTimeString()}</p>
          <div className={`${sender === myUserId ? "message-triangle-sent" : "message-triangle-received"}`}></div>
        </div>
      </div>
  )
}

export default Message