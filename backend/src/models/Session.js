import { sequelize } from '../libs/db.js';
import { DataTypes } from 'sequelize';

const Session = sequelize.define('Session', {
    sessionId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: 'session_id',
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
    },
    refreshToken: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        field: 'refresh_token',
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at',
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
    },
}, {
    tableName: 'sessions',
    timestamps: false,
});

export default Session;
