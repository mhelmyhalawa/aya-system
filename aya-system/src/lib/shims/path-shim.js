// تجاوز لوحدة path في بيئة المتصفح
const path = {
  join: (...args) => args.join('/'),
  resolve: (...args) => args.join('/'),
};

export default path;
export const join = path.join;
export const resolve = path.resolve;
