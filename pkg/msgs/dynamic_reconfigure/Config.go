//autogenerated:yes
//nolint:revive,lll
package dynamic_reconfigure

import (
    "github.com/bluenviron/goroslib/v2/pkg/msg"
)


type Config struct {
    msg.Package `ros:"dynamic_reconfigure"`
    Bools []BoolParameter
    Ints []IntParameter
    Strs []StrParameter
    Doubles []DoubleParameter
    Groups []GroupState
}

