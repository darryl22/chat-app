import { createContext } from "react";
// import type {Dispatch, SetStateAction } from "react"
import type { alertType } from '../TsAssets'


interface MainContextInterface {
    loggedInState: boolean,
    // setLoggedInState: Dispatch<SetStateAction<boolean>>,
    setLoggedInState: (val: boolean) => void,
    currentUser: string,
    // setCurrentUser: Dispatch<SetStateAction<string>>,
    setCurrentUser: (val: string) => void,
    theme: string,
    setTheme: (val: string) => void,
    AddAlert: (message: string, type: alertType) => void
}

export const MainContext = createContext<MainContextInterface | undefined>(undefined)