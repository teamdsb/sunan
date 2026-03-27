import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShipMonitorEntity } from 'src/database/entities/ship-monitor.entity';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { ShipMonitorController } from './ship-monitor.controller';
import { ShipMonitorService } from './ship-monitor.service';

@Module({
  imports: [TypeOrmModule.forFeature([ShipMonitorEntity, VesselEntity])],
  controllers: [ShipMonitorController],
  providers: [ShipMonitorService],
  exports: [ShipMonitorService],
})
export class ShipMonitorModule {}

