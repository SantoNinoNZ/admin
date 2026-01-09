/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'lora': ['Lora', 'serif'],
        'roboto': ['Roboto', 'sans-serif'],
      },
      colors: {
        primary: '#861D1D',
        secondary: '#F4B34C',
        dark: '#2B1E1A',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}