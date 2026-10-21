// Turbopack (`npm run dev`, `npm run build`, Docker) compiles Tailwind through the
// @tailwindcss/turbopack loader in next.config.ts, so PostCSS adds nothing there.
// Webpack (`npm run build:webpack`) needs Tailwind's PostCSS plugin instead:
//   npm install -D @tailwindcss/postcss@4.3.3
const config = {
  plugins: process.env.TURBOPACK ? {} : { "@tailwindcss/postcss": {} },
};

export default config;
