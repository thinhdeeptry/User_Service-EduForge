import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';
import { UsersService } from 'src/modules/users/users.service';
import { FindAllUsersDto } from './dto/find-all-users.dto';
import { UpdateUserDto } from 'src/modules/users/dto/update-user.dto';

@Injectable()
export class DashboardService {
  constructor(
    private usersService: UsersService,
  ) { }
  
  async create(createDashboardDto: CreateDashboardDto) {
    return this.usersService.createInAdmin(createDashboardDto);
  }

  async findAll({ query, current, pageSize }: FindAllUsersDto) {
    
    const skip = (current - 1) * pageSize;
    const filter = query
      ? {
        $or: [
          { name: { $regex: query, $options: 'i' } }, // Tìm theo name
          { email: { $regex: query, $options: 'i' } }, // Tìm theo email
        ],
      }
      : {};

    const users = await this.usersService.findMany(filter, skip, pageSize);
    const total = await this.usersService.count(filter);

    return {
      users,
      pagination: {
        current,
        pageSize,
        total,
      },
    };
  }

  async findOne(id: string) {
    const user = await this.usersService.findBy_id(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async update(id: string, updateDashboardDto: UpdateDashboardDto) {
    // Convert UpdateDashboardDto to UpdateUserDto
    const updateUserDto = new UpdateUserDto();
    
    // Copy all properties from updateDashboardDto to updateUserDto
    Object.assign(updateUserDto, updateDashboardDto);
    
    // Make sure the ID is set
    updateUserDto._id = id;
    
    const updatedUser = await this.usersService.update(updateUserDto);
    if (!updatedUser || updatedUser.modifiedCount === 0) {
      throw new NotFoundException(`User with ID ${id} not found or no changes made`);
    }
    
    // Get the updated user to return in the response
    const user = await this.usersService.findBy_id(id);
    
    return {
      message: 'User updated successfully',
      user
    };
  }

  async remove(id: string) {
    const result = await this.usersService.remove(id);
    if (!result || result.deletedCount === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return {
      message: 'User deleted successfully'
    };
  }

  async getUserForService(id: string, serviceName: string) {
    const user = await this.usersService.findBy_id(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    // Lọc dữ liệu dựa trên service gọi đến
    // Mỗi service chỉ nhận được thông tin cần thiết
    switch(serviceName) {
      case 'course-service':
        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          isActive: user.isActive
        };
      case 'payment-service':
        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          image: user.image,
          isActive: user.isActive
        };
      default:
        // Trả về thông tin cơ bản nếu không xác định được service
        return {
          _id: user._id,
          email: user.email,
          image: user.image,
          name: user.name,
          isActive: user.isActive
        };
    }
  }
}
