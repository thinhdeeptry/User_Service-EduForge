import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import { hashPasswordHelper } from 'src/helpers/util';
import aqp from 'api-query-params';
import mongoose from 'mongoose';
import { CreateAuthDto } from 'src/auth/dto/create-auth.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>

  ) { }


  isEmailExit = async (email: string) => {
    const user = await this.userModel.exists({ email });
    if (user) {
      return true;
    }
    return false;
  }
  async create(createUserDto: CreateUserDto) {
    const hashPassword = await hashPasswordHelper(createUserDto.password);
    const { name, email, phone, address, image } = createUserDto;
    const isEmailExit = await this.isEmailExit(email);
    if (isEmailExit) {
      throw new BadRequestException(`Email ${email} đã tồn tại, vui lòng sử dụng email khác!`);
    }
    const user = await this.userModel.create({
      name, email, password: hashPassword, phone, address, image
    });
    return { _id: user._id };
  }

  async findMany(filter: any, skip: number, limit: number) {
    return this.userModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .select('-password -otpSecret') // Loại bỏ dữ liệu nhạy cảm
      .exec();
  }

  async count(filter: any) {
    return this.userModel.countDocuments(filter).exec();
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }
  async findByEmail(email: string) {
    return await this.userModel.findOne({ email })
  }
  async findBy_id(_id: string) {
    return await this.userModel.findById(_id);
  }
  async update(updateUserDto: UpdateUserDto) {
    return await this.userModel.updateOne(
      { _id: updateUserDto._id }
      , { ...updateUserDto }
    );
  }

  async remove(_id: string) {
    //check id
    if (!mongoose.isValidObjectId(_id)) {
      throw new BadRequestException("Id không hợp lệ");
    }

    const foundUser = await this.userModel.findById(_id);
    if (!foundUser) {
      throw new BadRequestException("Không tìm thấy người dùng");
    }

    return this.userModel.deleteOne({ _id });
  }
  async updateOTP(userId: string, secret: string, otp: string, expiresAt: Date) {
    await this.userModel.updateOne({ _id: userId }, {
      otpSecret: secret,
      otp: otp,
      otpExpiresAt: expiresAt
    });
  }

  async clearOTP(userId: string) {
    await this.userModel.updateOne({ _id: userId }, {
      otpSecret: null,
      otp: null,
      otpExpiresAt: null
    });
  }

  async updateIsActive(userId: string, isActive: boolean) {
    await this.userModel.updateOne({ _id: userId }, { isActive });
  }
}
