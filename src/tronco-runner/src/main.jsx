import { createRoot } from 'react-dom/client'
import '@fontsource/montserrat/latin-400.css'
import '@fontsource/montserrat/latin-700.css'
import '@fontsource/montserrat/latin-800.css'
import '@fontsource/montserrat/latin-800-italic.css'
import '@fontsource/montserrat/latin-900-italic.css'
import './styles.css'
import { App } from './App'

createRoot(document.getElementById('root')).render(<App />)
