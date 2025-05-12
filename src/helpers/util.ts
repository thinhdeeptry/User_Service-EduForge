const bcrypt = require('bcrypt');
const saltRounds = 10;

export const hashPasswordHelper = async (plainPassword: string) => {
    try {
        return await bcrypt.hash(plainPassword, saltRounds);
    } catch (err) {
        console.error(err);
    }
}
export const comparePasswordHelper = async (plainPassword: string, hashPassword: string, accountType): Promise<boolean> => {
    if(!hashPassword || typeof hashPassword !== 'string' && accountType!= 'LOCAL') {
        return false;   
    }
    if (!plainPassword || typeof plainPassword !== 'string') {
        throw new Error('Mật khẩu phải là một chuỗi không rỗng');
    }
    if (!hashPassword || typeof hashPassword !== 'string') {
        throw new Error('Mật khẩu đã mã hóa phải là một chuỗi không rỗng');
    }

    try {
        return await bcrypt.compare(plainPassword, hashPassword);
    } catch (err) {
        console.error('Lỗi khi so sánh mật khẩu:', err);
        throw new Error('Không thể so sánh mật khẩu. Vui lòng kiểm tra dữ liệu đầu vào.');
    }
};
