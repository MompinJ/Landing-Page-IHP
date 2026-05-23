import { motion } from 'motion/react'
import { Menu } from 'lucide-react'
import { LogoMark, AppleButton } from './primitives'

const links = ['Solutions', 'Pricing', 'Blog', 'Documentation', 'Careers']

export default function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative z-20 py-5"
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        <LogoMark />

        <div className="hidden md:flex items-center gap-8">
          {links.map((link, i) => (
            <motion.a
              key={link}
              href="#"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.5 }}
              className="text-white/70 text-sm font-medium hover:text-white transition-colors"
            >
              {link}
            </motion.a>
          ))}
        </div>

        <div className="hidden md:flex">
          <AppleButton />
        </div>

        <button className="md:hidden w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
          <Menu className="w-4 h-4 text-white/70" />
        </button>
      </div>
    </motion.nav>
  )
}
