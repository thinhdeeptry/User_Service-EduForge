import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })//tự động thêm thời gian tạo và cập nhật
export class User {
    @Prop({ required: true })
    name: string;
    @Prop({ required: true })
    email: string;
    @Prop({ required: true })
    password: string;
    @Prop({ required: false })
    phone: string;
    @Prop({ required: false })
    address: string;
    @Prop({ required: false })
    image: string;
    @Prop({ default: "USER",enum: ['ADMIN', 'USER'] })
    role: string;
    @Prop({ default: "LOCAL" })
    accountType: string;
    @Prop({ default: false })
    isActive: boolean;
    @Prop({ required: false })
    otpSecret?: string;
    @Prop({ required: false })
    otp: string;
    @Prop({ required: false })
    otpExpiresAt: Date;

}

export const UserSchema = SchemaFactory.createForClass(User);
