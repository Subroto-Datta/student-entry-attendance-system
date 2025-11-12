import { motion } from 'framer-motion'
import { buttonTap, springTransition } from '@/utils/animations'

export default function AnimatedButton({ children, className = "", ...props }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={buttonTap}
      transition={springTransition}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}












