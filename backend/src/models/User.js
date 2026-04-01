import { DataTypes } from "sequelize";
import { sequelize } from "../libs/db.js";

const User = sequelize.define("User", {
    userId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: "user_id",
    },
    username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        set(value) {
            this.setDataValue("username", value.trim().toLowerCase());
        },
        field: "username",
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        set(value) {
            this.setDataValue("email", value.trim().toLowerCase());
        },
        field: "email",
    },
    fullName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        set(value) {
            this.setDataValue("fullName", value.trim());
        },
        field: "full_name",
    },
    passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "password_hash",
    },
    role: {
        type: DataTypes.ENUM("ADMIN", "RESIDENT"),
        allowNull: false,
        defaultValue: "RESIDENT",
        field: "role",
    },
    status: {
        type: DataTypes.ENUM("ACTIVE", "LOCKED"),
        defaultValue: "ACTIVE",
        field: "status",
    }
}, {
    tableName: "users",
    timestamps: true,
    underscored: true
});

export default User;
