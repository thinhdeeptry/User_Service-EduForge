import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import {Model} from 'mongoose';
import { hashPasswordHelper } from 'src/helpers/util';
import aqp from 'api-query-params';
@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) 
  private userModel: Model<User>) {}


  isEmailExit= async (email:string)=>{
    const user = await this.userModel.exists({email});
    if(user){
      return true;
    }
    return false;
  }
  async create(createUserDto: CreateUserDto) {
    const hashPassword = await hashPasswordHelper(createUserDto.password);
    const {name, email, password,phone, address, image} = createUserDto;
    const isEmailExit = await this.isEmailExit(email);
    if(isEmailExit){
      throw new BadRequestException(`Email ${email} đã tồn tại, vui lòng sử dụng email khác!`);
    }
    const user = await this.userModel.create({
      name, email, password: hashPassword, phone, address, image
    });
    return {_id:user._id};
  }

  async findAll(query: string, current: number, pageSize: number) {
    const {filter, sort} = aqp(query);

    if(filter.current) delete filter.current;
    if(filter.pageSize) delete filter.pageSize;

    if(!current) current = 1;
    if(!pageSize) pageSize = 10;

    const totalItems = (await this.userModel.find(filter)).length
    const totalPages = Math.ceil(totalItems/pageSize);
    
    const skip = (current - 1) * pageSize;


    const results = await this.userModel
    .find(filter)
    .limit(pageSize)
    .skip(skip)
    .select('-password')
    .sort(sort as any);
    return {results, totalItems, totalPages, current, pageSize};
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  async update( updateUserDto: UpdateUserDto) {
    return await this.userModel.updateOne(
      {_id: updateUserDto._id}
      ,{...updateUserDto}
    );
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
