//autogenerated:yes
//nolint:revive,lll
package mower_map

import (
    "github.com/bluenviron/goroslib/v2/pkg/msg"
)


type ClearNavPointSrvReq struct {
    msg.Package `ros:"mower_map"`
}



type ClearNavPointSrvRes struct {
    msg.Package `ros:"mower_map"`
}

type ClearNavPointSrv struct {
    msg.Package `ros:"mower_map"`
    ClearNavPointSrvReq
    ClearNavPointSrvRes
}
