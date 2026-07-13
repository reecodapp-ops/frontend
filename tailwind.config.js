/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        navy: 'var(--black)',
        'bg-gray': 'var(--white)',
        surface: '#FFFFFF',
        border: 'var(--border)',
        muted: 'var(--muted)',
        success: 'var(--accent-green)',
        warning: 'var(--accent-yellow)',
        danger: '#DE350B',
        purple: 'var(--accent-purple)',
        'accent-green': 'var(--accent-green)',
        'accent-yellow': 'var(--accent-yellow)',
        'accent-purple': 'var(--accent-purple)',
        black: 'var(--black)',
        white: 'var(--white)',
      },
      fontFamily: {
        sans: ['var(--body-font)', 'sans-serif'],
        heading: ['var(--heading-font)', 'sans-serif'],
      },
      borderRadius: {
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        modal: 'var(--shadow-modal)',
      },
    },
  },
  plugins: [],
}
