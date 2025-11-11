import { motion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Upload, Radio, TrendingUp } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '@/utils/cn'
import { slideInDown, fadeIn, springTransition } from '@/utils/animations'

export default function Layout({ children }) {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Live', icon: Radio },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/upload', label: 'Upload', icon: Upload },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <motion.header 
        className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 sticky top-0 z-50"
        initial="initial"
        animate="animate"
        variants={slideInDown}
        transition={springTransition}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <motion.div 
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, ...springTransition }}
            >
              <motion.div 
                className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600"
                whileHover={{ scale: 1.1, rotate: [0, -10, 10, -10, 0] }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <TrendingUp className="h-6 w-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Attendance Hub
                </h1>
                <p className="text-xs text-muted-foreground">Analytics & Insights</p>
              </div>
            </motion.div>
            
            <nav className="flex items-center gap-2">
              {navItems.map((item, index) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1, ...springTransition }}
                  >
                    <Link to={item.path}>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant={isActive ? "default" : "ghost"}
                          className={cn(
                            "gap-2",
                            isActive && "bg-gradient-to-r from-blue-600 to-indigo-600"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Button>
                      </motion.div>
                    </Link>
                  </motion.div>
                )
              })}
            </nav>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 mt-auto">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            © 2025 Attendance Management System. Built with React & AWS Serverless.
          </p>
        </div>
      </footer>
    </div>
  )
}

