import { Injectable } from '@nestjs/common';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';
import { UsersService } from 'src/modules/users/users.service';
import { FindAllUsersDto } from './dto/find-all-users.dto';
import { CreateUserDto } from 'src/modules/users/dto/create-user.dto';

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

  findOne(id: number) {
    return `This action returns a #${id} dashboard`;
  }

  update(id: number, updateDashboardDto: UpdateDashboardDto) {
    return `This action updates a #${id} dashboard`;
  }

  remove(id: number) {
    return `This action removes a #${id} dashboard`;
  }
}
