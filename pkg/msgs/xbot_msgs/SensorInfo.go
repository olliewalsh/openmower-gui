//autogenerated:yes
//nolint:revive,lll
package xbot_msgs

import (
    "github.com/bluenviron/goroslib/v2/pkg/msg"
)


const (
	SensorInfo_TYPE_STRING                             uint8  = 1
	SensorInfo_TYPE_DOUBLE                             uint8  = 2
	SensorInfo_VALUE_DESCRIPTION_UNKNOWN               uint8  = 0
	SensorInfo_VALUE_DESCRIPTION_TEMPERATURE           uint8  = 1
	SensorInfo_VALUE_DESCRIPTION_VELOCITY              uint8  = 2
	SensorInfo_VALUE_DESCRIPTION_ACCELERATION          uint8  = 3
	SensorInfo_VALUE_DESCRIPTION_VOLTAGE               uint8  = 4
	SensorInfo_VALUE_DESCRIPTION_CURRENT               uint8  = 5
	SensorInfo_VALUE_DESCRIPTION_PERCENT               uint8  = 6
	SensorInfo_VALUE_DESCRIPTION_DISTANCE              uint8  = 7
	SensorInfo_FLAG_GPS_RTK                            uint16 = 1
	SensorInfo_FLAG_GPS_RTK_FIXED                      uint16 = 2
	SensorInfo_FLAG_GPS_RTK_FLOAT                      uint16 = 4
	SensorInfo_FLAG_GPS_DEAD_RECKONING                 uint16 = 8
	SensorInfo_FLAG_SENSOR_FUSION_RECENT_ABSOLUTE_POSE uint16 = 1
	SensorInfo_FLAG_SENSOR_FUSION_DEAD_RECKONING       uint16 = 8
)

type SensorInfo struct {
	msg.Package        `ros:"xbot_msgs"`
	msg.Definitions    `ros:"uint8 TYPE_STRING=1,uint8 TYPE_DOUBLE=2,uint8 VALUE_DESCRIPTION_UNKNOWN=0,uint8 VALUE_DESCRIPTION_TEMPERATURE=1,uint8 VALUE_DESCRIPTION_VELOCITY=2,uint8 VALUE_DESCRIPTION_ACCELERATION=3,uint8 VALUE_DESCRIPTION_VOLTAGE=4,uint8 VALUE_DESCRIPTION_CURRENT=5,uint8 VALUE_DESCRIPTION_PERCENT=6,uint8 VALUE_DESCRIPTION_DISTANCE=7,uint16 FLAG_GPS_RTK=1,uint16 FLAG_GPS_RTK_FIXED=2,uint16 FLAG_GPS_RTK_FLOAT=4,uint16 FLAG_GPS_DEAD_RECKONING=8,uint16 FLAG_SENSOR_FUSION_RECENT_ABSOLUTE_POSE=1,uint16 FLAG_SENSOR_FUSION_DEAD_RECKONING=8"`
	SensorId           string
	SensorName         string
	ValueType          uint8
	ValueDescription   uint8
	Unit               string
	HasMinMax          bool
	MinValue           float64
	MaxValue           float64
	HasCriticalLow     bool
	LowerCriticalValue float64
	HasCriticalHigh    bool
	UpperCriticalValue float64
}

