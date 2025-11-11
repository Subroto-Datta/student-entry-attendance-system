import { motion } from 'framer-motion'
import { pageTransition } from '@/utils/animations'

export default function AnimatedPage({ children, className = "" }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  )
}








