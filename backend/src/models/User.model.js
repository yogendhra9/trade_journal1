import mongoose from 'mongoose';
import dotenv from 'dotenv';

const UserSchema = new mongoose.Schema(
    {
        name:
        {
            type: String,
            required: true,
            trim: true,
        },
        email:
        {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password:
        {
            type: String,
            required: true,
        },
        // Experience level for adaptive LLM responses
        experienceLevel: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced'],
            default: 'beginner'
        },
        // User's preferred currency
        currency: {
            type: String,
            enum: ['INR', 'USD'],
            default: 'INR'
        }
    },
     {timestamps: true}
);

const User  = mongoose.model("User", UserSchema);

export default User;