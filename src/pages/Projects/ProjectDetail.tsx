import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, X, ExternalLink, CheckSquare, Square, Eye, Edit3 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { GroupProject } from '../../types'
import { getProjectById, updateProject } from '../../db/projects'
import { Button } from '../../components/ui/Button'
import { nanoid } from '../../utils/nanoid'
import { clsx } from '../../utils/clsx'

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<GroupProject | null>(null)
  const [notePreview, setNotePreview] = useState(false)
  const [memberInput, setMemberInput] = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskAssignee, setTaskAssignee] = useState('')
  const noteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (id) getProjectById(id).then(p => { if (p) setProject(p) })
  }, [id])

  function patch(data: Partial<GroupProject>) {
    if (!project) return
    const next = { ...project, ...data }
    setProject(next)
    updateProject(project.id, data)
  }

  function handleNotesChange(val: string) {
    if (!project) return
    setProject(p => p ? { ...p, notes: val } : p)
    if (noteTimerRef.current) clearTimeout(noteTimerRef.current)
    noteTimerRef.current = setTimeout(() => updateProject(project.id, { notes: val }), 800)
  }

  function addMember() {
    const name = memberInput.trim()
    if (!name || !project || project.members.includes(name)) return
    patch({ members: [...project.members, name] })
    setMemberInput('')
  }

  function addLink() {
    if (!linkLabel.trim() || !linkUrl.trim() || !project) return
    patch({ links: [...project.links, { label: linkLabel.trim(), url: linkUrl.trim() }] })
    setLinkLabel('')
    setLinkUrl('')
  }

  function addTask() {
    const title = taskTitle.trim()
    if (!title || !project) return
    patch({ tasks: [...project.tasks, { id: nanoid(), title, assignee: taskAssignee.trim() || undefined, done: false }] })
    setTaskTitle('')
    setTaskAssignee('')
  }

  function toggleTask(taskId: string) {
    if (!project) return
    patch({ tasks: project.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t) })
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400">載入中…</p>
      </div>
    )
  }

  const doneTasks = project.tasks.filter(t => t.done).length

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <button
        onClick={() => navigate('/projects')}
        className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-6 transition-colors"
      >
        <ArrowLeft size={14} /> 小組專案
      </button>

      {/* Header */}
      <div className="mb-8">
        <input
          className="text-2xl font-bold text-slate-900 dark:text-white bg-transparent border-b-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none w-full transition-colors pb-1"
          value={project.name}
          onChange={e => patch({ name: e.target.value })}
        />
        <div className="flex items-center gap-4 mt-2">
          <input
            className="input text-xs w-40"
            type="date"
            value={project.dueDate?.slice(0, 10) ?? ''}
            onChange={e => patch({ dueDate: e.target.value || undefined })}
            title="截止日期"
          />
        </div>
      </div>

      {/* Members */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">成員</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {project.members.map(m => (
            <span key={m} className="flex items-center gap-1.5 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full px-3 py-1">
              {m}
              <button onClick={() => patch({ members: project.members.filter(x => x !== m) })} className="text-slate-400 hover:text-red-500 transition-colors">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1 text-sm"
            placeholder="新增成員姓名"
            value={memberInput}
            onChange={e => setMemberInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addMember() }}
          />
          <Button size="sm" variant="secondary" onClick={addMember} disabled={!memberInput.trim()}>
            <Plus size={13} /> 新增
          </Button>
        </div>
      </section>

      {/* Links */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">相關連結</h2>
        {project.links.length > 0 && (
          <div className="space-y-2 mb-3">
            {project.links.map((link, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
                <a href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline flex-1 min-w-0 truncate">
                  <ExternalLink size={12} className="flex-shrink-0" /> {link.label}
                </a>
                <button onClick={() => patch({ links: project.links.filter((_, j) => j !== i) })} className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input className="input flex-1 text-sm" placeholder="名稱" value={linkLabel} onChange={e => setLinkLabel(e.target.value)} />
          <input className="input flex-1 text-sm" placeholder="https://…" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addLink() }} />
          <Button size="sm" variant="secondary" onClick={addLink} disabled={!linkLabel.trim() || !linkUrl.trim()}>
            <Plus size={13} />
          </Button>
        </div>
      </section>

      {/* Tasks */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
          任務清單 {project.tasks.length > 0 && <span className="normal-case font-normal ml-1">{doneTasks}/{project.tasks.length}</span>}
        </h2>
        {project.tasks.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {project.tasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 group">
                <button onClick={() => toggleTask(task.id)} className="flex-shrink-0">
                  {task.done
                    ? <CheckSquare size={16} className="text-green-500" />
                    : <Square size={16} className="text-slate-300 dark:text-slate-600" />
                  }
                </button>
                <span className={clsx('text-sm flex-1', task.done && 'line-through text-slate-400')}>
                  {task.title}
                </span>
                {task.assignee && (
                  <span className="text-xs text-slate-400 flex-shrink-0">{task.assignee}</span>
                )}
                <button
                  onClick={() => patch({ tasks: project.tasks.filter(t => t.id !== task.id) })}
                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input className="input flex-1 text-sm" placeholder="新增任務" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTask() }} />
          <input className="input w-28 text-sm" placeholder="負責人" value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTask() }} />
          <Button size="sm" variant="secondary" onClick={addTask} disabled={!taskTitle.trim()}>
            <Plus size={13} />
          </Button>
        </div>
      </section>

      {/* Notes */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">筆記</h2>
          <button
            onClick={() => setNotePreview(v => !v)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            {notePreview ? <><Edit3 size={12} /> 編輯</> : <><Eye size={12} /> 預覽</>}
          </button>
        </div>
        {notePreview ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 min-h-[120px] prose prose-sm dark:prose-invert max-w-none">
            {project.notes ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{project.notes}</ReactMarkdown>
            ) : (
              <p className="text-slate-400 italic text-sm">（尚無筆記）</p>
            )}
          </div>
        ) : (
          <textarea
            className="input min-h-[160px] resize-y font-mono text-sm"
            placeholder="輸入筆記（支援 Markdown）…"
            value={project.notes}
            onChange={e => handleNotesChange(e.target.value)}
          />
        )}
      </section>
    </div>
  )
}
