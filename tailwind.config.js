/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bb: {
          blue: '#0038A8',
          dark: '#002266',
          yellow: '#F8D117',
          yellowHover: '#E5BF00',
        },
      },
    },
  },
  plugins: [],
};
