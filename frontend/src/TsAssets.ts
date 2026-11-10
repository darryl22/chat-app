
export interface Chat {
  chatName: string,
  _id: string,
  dateCreated: string,
  dateCreatedInMs: number,
  latestMessage: string,
  latestMessageMs: number,
  type: string,
  members: string[]
}

export interface Member {
  _id: string,
  userId: string,
  userName: string,
  chatId: string,
  chatTitle: string,
  latestMessage: string,
  latestMessageMs: number,
}

export interface MessageItem {
  _id: string,
  chatId: string,
  message: string,
  sender: string,
  senderName: string,
  dateAdded: string,
  dateAddedInMs: number,
  myUserId: string,
  messageType: string,
  replyMessage?: string,
  replyMessageMs?: number,
  replyId?: string,
  replyOriginDeleted?: boolean,
  replyOriginMessageType?: string,
  showReply?: (val: {show: boolean, message: string, replyMessageMs: number, replyId: string, replyOriginMessageType: string}) => void,
  messagesRef?: Map<string, HTMLDivElement>,
  jumpToReply?: (val: string | undefined, replyMessageMs: number) => void,
  fileName?: string,
  fileId?: string,
  fileSize?: number,
}

export interface loggedInUser {
  setLoginState: (val: boolean) => void,
  setCurrentUser: (val: string) => void
}

 export interface Friend {
  _id: string,
  userId: string,
  friendId: string,
  friendName: string,
  dateCreated: string,
  dateCreatedInMs: number,
  chatId: string
}

// interface FriendObject {
//   [key: `friend-${string}`]: Friend
// }

export interface User {
  user: string,
  _id: string
}

export type alertType = "ERROR" | "SUCCESS"