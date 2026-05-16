import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './contexts/AppContext'
import { Layout } from './components/Layout/Layout'
import { Dashboard } from './pages/Dashboard/Dashboard'
import { CourseList } from './pages/Courses/CourseList'
import { CourseDetail } from './pages/Courses/CourseDetail'
import { NoteEditor } from './pages/Notes/NoteEditor'
import { QuizMode } from './pages/Courses/QuizMode'
import { ReviewMode } from './pages/Courses/ReviewMode'
import { Search } from './pages/Search/Search'
import { ProjectList } from './pages/Projects/ProjectList'
import { ProjectDetail } from './pages/Projects/ProjectDetail'
import { Settings } from './pages/Settings/Settings'

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/courses" element={<CourseList />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/search" element={<Search />} />
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          {/* Full-screen pages outside the layout sidebar */}
          <Route path="/notes/:id" element={<NoteEditor />} />
          <Route path="/courses/:id/quiz" element={<QuizMode />} />
          <Route path="/courses/:id/review" element={<ReviewMode />} />
        </Routes>
      </HashRouter>
    </AppProvider>
  )
}
