package api

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"os"
	"strings"

	"github.com/cedbossneo/openmower-gui/pkg/types"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gopkg.in/yaml.v3"
)

const defaultSchemaURL = "https://raw.githubusercontent.com/ClemensElflein/OpenMowerMeta/main/backend/src/main/resources/assets/open_mower.default.schema.json"

func SettingsRoutes(r *gin.RouterGroup, dbProvider types.IDBProvider) {
	GetSettings(r, dbProvider)
	PostSettings(r, dbProvider)
	GetSettingsSchema(r, dbProvider)
	GetSettingsYAML(r, dbProvider)
	PostSettingsYAML(r, dbProvider)
}

// PostSettings saves the settings to the mower_config.sh file
//
// @Summary saves the settings to the mower_config.sh file
// @Description saves the settings to the mower_config.sh file
// @Tags settings
// @Accept  json
// @Produce  json
// @Param settings body map[string]any true "settings"
// @Success 200 {object} OkResponse
// @Failure 500 {object} ErrorResponse
// @Router /settings [post]
func PostSettings(r *gin.RouterGroup, dbProvider types.IDBProvider) gin.IRoutes {
	return r.POST("/settings", func(c *gin.Context) {
		var settingsPayload map[string]any
		err := c.BindJSON(&settingsPayload)
		if err != nil {
			c.JSON(500, ErrorResponse{
				Error: err.Error(),
			})
			return
		}
		mowerConfigFile, err := dbProvider.Get("system.mower.configFile")
		if err != nil {
			c.JSON(500, ErrorResponse{
				Error: err.Error(),
			})
			return
		}
		var settings = map[string]any{}
		configFileContent, err := os.ReadFile(string(mowerConfigFile))
		if err == nil {
			parse, err := godotenv.Parse(strings.NewReader(string(configFileContent)))
			if err == nil {
				for s, s2 := range parse {
					settings[s] = s2
				}
			}
		}
		for key, value := range settingsPayload {
			settings[key] = value
		}
		// Write settings to file mower_config.sh
		var fileContent string
		for key, value := range settings {
			if value == true {
				value = "True"
			}
			if value == false {
				value = "False"
			}
			fileContent += "export " + key + "=" + fmt.Sprintf("%#v", value) + "\n"
		}
		err = os.WriteFile(string(mowerConfigFile), []byte(fileContent), 0644)
		if err != nil {
			c.JSON(500, ErrorResponse{
				Error: err.Error(),
			})
			return
		}
		c.JSON(200, OkResponse{})
	})
}

// GetSettings returns a JSON object with the settings
//
// @Summary returns a JSON object with the settings
// @Description returns a JSON object with the settings
// @Tags settings
// @Produce  json
// @Success 200 {object} GetSettingsResponse
// @Failure 500 {object} ErrorResponse
// @Router /settings [get]
func GetSettings(r *gin.RouterGroup, dbProvider types.IDBProvider) gin.IRoutes {
	return r.GET("/settings", func(c *gin.Context) {
		mowerConfigFilePath, err := dbProvider.Get("system.mower.configFile")
		if err != nil {
			c.JSON(500, ErrorResponse{
				Error: err.Error(),
			})
			return
		}
		file, err := os.ReadFile(string(mowerConfigFilePath))
		if err != nil {
			c.JSON(500, ErrorResponse{
				Error: err.Error(),
			})
			return
		}
		settings, err := godotenv.Parse(strings.NewReader(string(file)))
		if err != nil {
			c.JSON(500, ErrorResponse{
				Error: err.Error(),
			})
			return
		}
		c.JSON(200, GetSettingsResponse{
			Settings: settings,
		})
	})
}

var (
	schemaCache     map[string]any
	schemaCacheMu   sync.RWMutex
	schemaCacheTime time.Time
	schemaCacheTTL  = 1 * time.Hour
)

// fetchSchemaFromUpstream fetches the JSON Schema from the upstream OpenMower repository.
func fetchSchemaFromUpstream(schemaURL string) (map[string]any, error) {
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Get(schemaURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch schema: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("upstream returned status %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read schema response: %w", err)
	}
	var schema map[string]any
	if err := json.Unmarshal(body, &schema); err != nil {
		return nil, fmt.Errorf("invalid schema JSON from upstream: %w", err)
	}
	return schema, nil
}

// applyMowgliOverlay adds Mowgli-specific entries to the upstream schema:
// - Adds "Mowgli" to OM_MOWER enum
// - Adds conditional OM_NO_COMMS when Mowgli is selected
// - Hides OM_HARDWARE_VERSION and ESC_TYPE for Mowgli (they're not relevant)
// - Promotes GPS port/protocol out of "advanced" with Mowgli defaults
// - Sets Mowgli-specific defaults for battery voltages (YardForce 500B uses 24V)
func applyMowgliOverlay(schema map[string]any) map[string]any {
	props, ok := schema["properties"].(map[string]any)
	if !ok {
		return schema
	}
	hw, ok := props["important_settings"].(map[string]any)
	if !ok {
		return schema
	}
	hwProps, ok := hw["properties"].(map[string]any)
	if !ok {
		return schema
	}

	// Add "Mowgli" to OM_MOWER enum if not already present
	omMower, ok := hwProps["OM_MOWER"].(map[string]any)
	if ok {
		if enumList, ok := omMower["enum"].([]any); ok {
			hasMowgli := false
			for _, v := range enumList {
				if v == "Mowgli" {
					hasMowgli = true
					break
				}
			}
			if !hasMowgli {
				omMower["enum"] = append(enumList, "Mowgli")
			}
		}
	}

	// Collect non-Mowgli enum values for conditionals
	nonMowgliEnumValues := []any{}
	if omMower != nil {
		if enumList, ok := omMower["enum"].([]any); ok {
			for _, v := range enumList {
				if v != "Mowgli" {
					nonMowgliEnumValues = append(nonMowgliEnumValues, v)
				}
			}
		}
	}

	// Move OM_HARDWARE_VERSION and ESC_TYPE behind a conditional
	// so they only show for non-Mowgli builds
	hwVersion, hasHWVersion := hwProps["OM_HARDWARE_VERSION"]
	escType, hasESCType := hwProps["OM_MOWER_ESC_TYPE"]

	if hasHWVersion || hasESCType {
		delete(hwProps, "OM_HARDWARE_VERSION")
		delete(hwProps, "OM_MOWER_ESC_TYPE")

		nonMowgliProps := map[string]any{}
		if hasHWVersion {
			nonMowgliProps["OM_HARDWARE_VERSION"] = hwVersion
		}
		if hasESCType {
			nonMowgliProps["OM_MOWER_ESC_TYPE"] = escType
		}

		nonMowgliCondition := map[string]any{
			"if": map[string]any{
				"properties": map[string]any{
					"OM_MOWER": map[string]any{"enum": nonMowgliEnumValues},
				},
			},
			"then": map[string]any{
				"properties": nonMowgliProps,
			},
		}

		mowgliCondition := map[string]any{
			"if": map[string]any{
				"properties": map[string]any{
					"OM_MOWER": map[string]any{"const": "Mowgli"},
				},
			},
			"then": map[string]any{
				"properties": map[string]any{
					"OM_NO_COMMS": map[string]any{
						"type":                   "boolean",
						"default":                true,
						"title":                  "Disable OpenMower Comms",
						"description":            "Mowgli uses its own communication with the mainboard. This disables the OpenMower communication node.",
						"x-environment-variable": "OM_NO_COMMS",
					},
				},
			},
		}

		existingAllOf, _ := hw["allOf"].([]any)
		hw["allOf"] = append(existingAllOf, nonMowgliCondition, mowgliCondition)
	}

	// Promote GPS settings out of "advanced" toggle for Mowgli
	// and set Mowgli-specific defaults (GPS on /dev/gps, UBX protocol)
	applyMowgliGPSOverlay(props)

	// Promote mower logic advanced settings (includes OM_PERIMETER_SIGNAL
	// which is Mowgli-specific)
	promoteAdvancedSection(props, "mower_logic_settings", nil)

	return schema
}

// applyMowgliGPSOverlay promotes GPS settings from "advanced" and sets
// Mowgli-specific defaults.
func applyMowgliGPSOverlay(props map[string]any) {
	overrides := map[string]map[string]any{
		"OM_GPS_PORT": {
			"default":     "/dev/gps",
			"title":       "GPS Port",
			"description": "Serial port for the GPS board. Mowgli default: /dev/gps",
		},
		"OM_GPS_PROTOCOL": {
			"default": "UBX",
		},
		"OM_GPS_BAUDRATE": {
			"default": "460800",
			"title":   "GPS Baud Rate",
		},
	}
	promoteAdvancedSection(props, "gps_settings", overrides)
}

// promoteAdvancedSection removes the "advanced" boolean toggle from a schema
// section and moves all conditionally-shown properties into the base properties.
// Optional overrides let the caller set Mowgli-specific defaults on promoted fields.
func promoteAdvancedSection(props map[string]any, sectionKey string, overrides map[string]map[string]any) {
	section, ok := props[sectionKey].(map[string]any)
	if !ok {
		return
	}
	sectionProps, ok := section["properties"].(map[string]any)
	if !ok {
		return
	}
	allOf, ok := section["allOf"].([]any)
	if !ok {
		return
	}

	var advancedProps map[string]any
	var remainingAllOf []any

	for _, cond := range allOf {
		condMap, ok := cond.(map[string]any)
		if !ok {
			remainingAllOf = append(remainingAllOf, cond)
			continue
		}
		ifBlock, ok := condMap["if"].(map[string]any)
		if !ok {
			remainingAllOf = append(remainingAllOf, cond)
			continue
		}
		ifProps, ok := ifBlock["properties"].(map[string]any)
		if !ok {
			remainingAllOf = append(remainingAllOf, cond)
			continue
		}
		if _, isAdvanced := ifProps["advanced"]; isAdvanced {
			if thenBlock, ok := condMap["then"].(map[string]any); ok {
				if thenProps, ok := thenBlock["properties"].(map[string]any); ok {
					advancedProps = thenProps
				}
			}
			continue
		}
		remainingAllOf = append(remainingAllOf, cond)
	}

	if advancedProps == nil {
		return
	}

	// Remove the "advanced" toggle
	delete(sectionProps, "advanced")

	// Promote all advanced properties into base properties
	for key, prop := range advancedProps {
		if overrides != nil {
			if ov, ok := overrides[key]; ok {
				if propMap, ok := prop.(map[string]any); ok {
					for k, v := range ov {
						propMap[k] = v
					}
				}
			}
		}
		sectionProps[key] = prop
	}

	if len(remainingAllOf) > 0 {
		section["allOf"] = remainingAllOf
	} else {
		delete(section, "allOf")
	}
}

// GetSettingsSchema returns the JSON Schema describing all mower configuration parameters.
// It fetches the schema from the upstream OpenMower repository and caches it,
// then applies a Mowgli-specific overlay.
//
// @Summary returns the mower config JSON Schema
// @Description returns the JSON Schema for mower configuration parameters
// @Tags settings
// @Produce  json
// @Success 200 {object} map[string]any
// @Failure 500 {object} ErrorResponse
// @Router /settings/schema [get]
func GetSettingsSchema(r *gin.RouterGroup, dbProvider types.IDBProvider) gin.IRoutes {
	return r.GET("/settings/schema", func(c *gin.Context) {
		// Check cache
		schemaCacheMu.RLock()
		if schemaCache != nil && time.Since(schemaCacheTime) < schemaCacheTTL {
			cached := schemaCache
			schemaCacheMu.RUnlock()
			c.JSON(200, cached)
			return
		}
		schemaCacheMu.RUnlock()

		// Determine schema URL
		schemaURL := defaultSchemaURL
		if customURL, err := dbProvider.Get("system.mower.schemaURL"); err == nil && len(customURL) > 0 {
			schemaURL = string(customURL)
		}

		schema, err := fetchSchemaFromUpstream(schemaURL)
		if err != nil {
			log.Printf("Failed to fetch schema from upstream: %v", err)
			// Fall back to local file if available
			localFile, localErr := os.ReadFile("asserts/mower_config.schema.json")
			if localErr != nil {
				c.JSON(500, ErrorResponse{
					Error: "failed to fetch schema from upstream and no local fallback: " + err.Error(),
				})
				return
			}
			if jsonErr := json.Unmarshal(localFile, &schema); jsonErr != nil {
				c.JSON(500, ErrorResponse{
					Error: "invalid local schema JSON: " + jsonErr.Error(),
				})
				return
			}
		}

		// Apply Mowgli overlay
		schema = applyMowgliOverlay(schema)

		// Update cache
		schemaCacheMu.Lock()
		schemaCache = schema
		schemaCacheTime = time.Now()
		schemaCacheMu.Unlock()

		c.JSON(200, schema)
	})
}

// GetSettingsYAML returns the current YAML configuration values
//
// @Summary returns the current YAML mower configuration
// @Description returns the current YAML mower configuration values
// @Tags settings
// @Produce  json
// @Success 200 {object} map[string]any
// @Failure 500 {object} ErrorResponse
// @Router /settings/yaml [get]
func GetSettingsYAML(r *gin.RouterGroup, dbProvider types.IDBProvider) gin.IRoutes {
	return r.GET("/settings/yaml", func(c *gin.Context) {
		configFilePath, err := dbProvider.Get("system.mower.yamlConfigFile")
		if err != nil {
			c.JSON(500, ErrorResponse{
				Error: err.Error(),
			})
			return
		}
		file, err := os.ReadFile(string(configFilePath))
		if err != nil {
			// Return empty config if file doesn't exist yet
			if os.IsNotExist(err) {
				c.JSON(200, map[string]any{})
				return
			}
			c.JSON(500, ErrorResponse{
				Error: err.Error(),
			})
			return
		}
		var config map[string]any
		if err := yaml.Unmarshal(file, &config); err != nil {
			c.JSON(500, ErrorResponse{
				Error: "invalid YAML: " + err.Error(),
			})
			return
		}
		c.JSON(200, config)
	})
}

// PostSettingsYAML saves the mower configuration as YAML
//
// @Summary saves the mower configuration as YAML
// @Description saves the mower configuration as YAML, merging with existing values
// @Tags settings
// @Accept  json
// @Produce  json
// @Param settings body map[string]any true "settings"
// @Success 200 {object} OkResponse
// @Failure 500 {object} ErrorResponse
// @Router /settings/yaml [post]
func PostSettingsYAML(r *gin.RouterGroup, dbProvider types.IDBProvider) gin.IRoutes {
	return r.POST("/settings/yaml", func(c *gin.Context) {
		var payload map[string]any
		if err := c.BindJSON(&payload); err != nil {
			c.JSON(400, ErrorResponse{
				Error: err.Error(),
			})
			return
		}
		configFilePath, err := dbProvider.Get("system.mower.yamlConfigFile")
		if err != nil {
			c.JSON(500, ErrorResponse{
				Error: err.Error(),
			})
			return
		}
		// Read existing config and merge
		existing := map[string]any{}
		file, err := os.ReadFile(string(configFilePath))
		if err == nil {
			_ = yaml.Unmarshal(file, &existing)
		}
		for key, value := range payload {
			existing[key] = value
		}
		out, err := yaml.Marshal(existing)
		if err != nil {
			c.JSON(500, ErrorResponse{
				Error: "failed to marshal YAML: " + err.Error(),
			})
			return
		}
		if err := os.WriteFile(string(configFilePath), out, 0644); err != nil {
			c.JSON(500, ErrorResponse{
				Error: err.Error(),
			})
			return
		}
		c.JSON(200, OkResponse{})
	})
}
