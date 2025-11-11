import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { cn } from '@/utils/cn'
import { slideInUp, cardHover, springTransition } from '@/utils/animations'

export default function InsightCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon,
  gradient = 'from-blue-500 to-indigo-500',
  className,
  size = 'md', // sm, md, lg
  index = 0
}) {
  const sizeClasses = {
    sm: 'h-32',
    md: 'h-48',
    lg: 'h-64',
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
      <Card className={cn("border-0 shadow-lg overflow-hidden group cursor-pointer", className)}>
        <motion.div 
          className={cn("h-full bg-gradient-to-br", gradient, "relative")}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="absolute inset-0 bg-black/5"
            whileHover={{ backgroundColor: "rgba(0,0,0,0.1)" }}
            transition={{ duration: 0.3 }}
          />
          <CardContent className="p-6 h-full flex flex-col justify-between relative z-10">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <motion.p 
                  className="text-sm font-medium text-white/90 mb-1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                >
                  {title}
                </motion.p>
                <motion.p 
                  className={cn(
                    "font-bold text-white",
                    size === 'sm' ? 'text-2xl' : size === 'lg' ? 'text-4xl' : 'text-3xl'
                  )}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.3, type: "spring", stiffness: 200 }}
                >
                  {value}
                </motion.p>
                {subtitle && (
                  <motion.p 
                    className="text-xs text-white/70 mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.4 }}
                  >
                    {subtitle}
                  </motion.p>
                )}
              </div>
              {Icon && (
                <motion.div 
                  className="p-3 rounded-lg bg-white/20 backdrop-blur-sm"
                  initial={{ opacity: 0, rotate: -180, scale: 0 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.3, type: "spring", stiffness: 300 }}
                  whileHover={{ rotate: 360, scale: 1.1, transition: { duration: 0.5 } }}
                >
                  <Icon className={cn(
                    "text-white",
                    size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-8 w-8' : 'h-6 w-6'
                  )} />
                </motion.div>
              )}
            </div>
          </CardContent>
        </motion.div>
      </Card>
    </motion.div>
  )
}

