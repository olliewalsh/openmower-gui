//autogenerated:yes
//nolint:revive,lll
package mower_msgs

import (
    "github.com/bluenviron/goroslib/v2/pkg/msg"
)


type GPSControlSrvReq struct {
    msg.Package `ros:"mower_msgs"`
    GpsEnabled uint8
}



type GPSControlSrvRes struct {
    msg.Package `ros:"mower_msgs"`
}

type GPSControlSrv struct {
    msg.Package `ros:"mower_msgs"`
    GPSControlSrvReq
    GPSControlSrvRes
}
