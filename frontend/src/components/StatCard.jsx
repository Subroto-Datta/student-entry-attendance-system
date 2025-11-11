import { motion } from 'framer-motion'
import { Card, CardContent } from './ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/utils/cn'
import { slideInUp, cardHover, springTransition } from '@/utils/animations'

export default function StatCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral',
  icon: Icon,
  gradient = 'from-blue-500 to-indigo-500',
  index = 0
}) {
  const getTrendIcon = () => {
    if (changeType === 'positive') return <TrendingUp className="h-4 w-4" />
    if (changeType === 'negative') return <TrendingDown className="h-4 w-4" />
    return <Minus className="h-4 w-4" />
  }

  const getChangeColor = () => {
    if (changeType === 'positive') return 'text-green-600 dark:text-green-400'
    if (changeType === 'negative') return 'text-red-600 dark:text-red-400'
    return 'text-muted-foreground'
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={slideInUp}
      transition={{ ...springTransition, delay: index * 0.1 }}
      whileHover={cardHover}
      whileTap={{ scale: 0.98 }}
    >
      <Card className="overflow-hidden border-0 shadow-lg cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <motion.p 
                className="text-sm font-medium text-muted-foreground mb-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 + 0.2 }}
              >
                {title}
              </motion.p>
              <motion.p 
                className="text-3xl font-bold mb-2"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 + 0.3, type: "spring", stiffness: 200 }}
              >
                {value}
              </motion.p>
              {change !== undefined && (
                <motion.div 
                  className={cn("flex items-center gap-1 text-sm font-medium", getChangeColor())}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.4 }}
                >
                  {getTrendIcon()}
                  <span>{change}%</span>
                </motion.div>
              )}
            </div>
            {Icon && (
              <motion.div 
                className={cn("p-3 rounded-lg bg-gradient-to-br", gradient)}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 + 0.3, type: "spring", stiffness: 300 }}
                whileHover={{ rotate: [0, -10, 10, -10, 0], transition: { duration: 0.5 } }}
              >
                <Icon className="h-6 w-6 text-white" />
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

