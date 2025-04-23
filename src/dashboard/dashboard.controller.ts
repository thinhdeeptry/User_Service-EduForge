import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, UsePipes, ValidationPipe, Headers } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { RolesGuard } from 'src/auth/RolesGuard';
import { Roles } from 'src/decorator/roles.decorator';
import { FindAllUsersDto } from './dto/find-all-users.dto';
import { ApiKey } from 'src/decorator/api-key.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }

  @Post()
  @Roles('ADMIN')
  @UsePipes(new ValidationPipe({ transform: true })) // tự động chuyển đổi dữ liệu theo đúng FindAllUsersDto
  create(@Body() createDashboardDto: CreateDashboardDto) {
    return this.dashboardService.create(createDashboardDto);
  }

  @Get()
  @Roles('ADMIN')
  @UsePipes(new ValidationPipe({ transform: true })) // tự động chuyển đổi dữ liệu theo đúng FindAllUsersDto
  async findAll(@Query() findAllUsersDto: FindAllUsersDto) {
    return this.dashboardService.findAll(findAllUsersDto);
  }


  @Get(':id')
  @Roles('ADMIN')
  findOne(@Param('id') id: string) {
    return this.dashboardService.findOne(id);
  }
  @Get('internal/user/:id')
  @ApiKey() // Sử dụng API key thay vì JWT để xác thực giữa các service
  getUserForInternalService(@Param('id') id: string, @Headers('service-name') serviceName: string) {
    // Log để theo dõi service nào đang gọi
    console.log(`Service ${serviceName} requested user data for ID: ${id}`);
    // Trả về thông tin người dùng với dữ liệu được lọc phù hợp
    return this.dashboardService.getUserForService(id, serviceName);
  }
  @Patch(':id')
  @Roles('ADMIN')
  @UsePipes(new ValidationPipe({ transform: true }))
  update(@Param('id') id: string, @Body() updateDashboardDto: UpdateDashboardDto) {
    // Ensure the ID is set in the DTO
    updateDashboardDto._id = id;
    return this.dashboardService.update(id, updateDashboardDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.dashboardService.remove(id);
  }
}
