// تجاوز لوحدة fs في بيئة المتصفح
const fs = {
  existsSync: () => false,
  readFileSync: () => '[]',
  writeFileSync: () => {},
  mkdirSync: () => {}
};

export default fs;
export const existsSync = fs.existsSync;
export const readFileSync = fs.readFileSync;
export const writeFileSync = fs.writeFileSync;
export const mkdirSync = fs.mkdirSync;
