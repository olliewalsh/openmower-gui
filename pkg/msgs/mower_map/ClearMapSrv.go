//autogenerated:yes
//nolint:revive,lll
package mower_map

import (
    "github.com/bluenviron/goroslib/v2/pkg/msg"
)


type ClearMapSrvReq struct {
    msg.Package `ros:"mower_map"`
}



type ClearMapSrvRes struct {
    msg.Package `ros:"mower_map"`
}

type ClearMapSrv struct {
    msg.Package `ros:"mower_map"`
    ClearMapSrvReq
    ClearMapSrvRes
}
