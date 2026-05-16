import { createContext, useContext, useEffect, useReducer } from 'react'
import type { Semester } from '../types'
import { getAllSemesters, seedDefaultSemester, setActiveSemester } from '../db/semesters'

interface AppState {
  theme: 'light' | 'dark'
  activeSemesterId: string | null
  semesters: Semester[]
}

type AppAction =
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_SEMESTERS'; payload: Semester[] }
  | { type: 'SET_ACTIVE_SEMESTER'; payload: string }

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: action.payload }
    case 'SET_SEMESTERS':
      return {
        ...state,
        semesters: action.payload,
        activeSemesterId: action.payload.find(s => s.isActive)?.id ?? state.activeSemesterId,
      }
    case 'SET_ACTIVE_SEMESTER':
      return { ...state, activeSemesterId: action.payload }
    default:
      return state
  }
}

const initialState: AppState = {
  theme: (localStorage.getItem('theme') as 'light' | 'dark') ?? 'light',
  activeSemesterId: null,
  semesters: [],
}

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  switchSemester: (id: string) => Promise<void>
  reloadSemesters: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', state.theme)
  }, [state.theme])

  async function reloadSemesters() {
    const semesters = await getAllSemesters()
    dispatch({ type: 'SET_SEMESTERS', payload: semesters })
  }

  async function switchSemester(id: string) {
    await setActiveSemester(id)
    dispatch({ type: 'SET_ACTIVE_SEMESTER', payload: id })
    await reloadSemesters()
  }

  useEffect(() => {
    seedDefaultSemester().then(reloadSemesters)
  }, [])

  return (
    <AppContext.Provider value={{ state, dispatch, switchSemester, reloadSemesters }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
