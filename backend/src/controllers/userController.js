export const authMe = async (req, res) => {
    try{
        const user = req.user;

        return res.status(200).json(user);
    } catch(error) {
        console.error("Lỗi lấy thông tin người dùng:", error);
        return res.status(500).json({ message: "Lỗi máy chủ nội bộ." });
    }
};

export const test = async (req, res) => {
    return res.sendStatus(204);
}