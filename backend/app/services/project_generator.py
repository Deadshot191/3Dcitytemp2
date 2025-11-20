"""
Project Generation Service
Generates procedural city layouts and corporate campuses using radial positioning
"""
import math
import uuid
from typing import List, Tuple, Dict
from app.models.location import LocationEmbedded, LocationPosition
from app.models.road import RoadEmbedded
from app.models.project import ModelType


# Zone Templates for City Planning
CITY_ZONE_TEMPLATES = {
    "government": {
        "buildings": [
            {"name": "City Hall", "type": "Building", "color": "#3b82f6", "description": "The central administrative building of the city."},
            {"name": "Police Headquarters", "type": "Building", "color": "#1d4ed8", "description": "Main police station serving the city."}
        ]
    },
    "healthcare": {
        "buildings": [
            {"name": "Central Hospital", "type": "Hospital", "color": "#ef4444", "description": "Major medical facility with emergency and specialist care."},
            {"name": "Medical Center", "type": "Hospital", "color": "#ef4444", "description": "Modern healthcare facility with outpatient services."}
        ]
    },
    "education": {
        "buildings": [
            {"name": "Public Library", "type": "Library", "color": "#84cc16", "description": "Main library with extensive collection and study areas."},
            {"name": "High School", "type": "School", "color": "#fb923c", "description": "Public high school with modern facilities."}
        ]
    },
    "commercial": {
        "buildings": [
            {"name": "Shopping Mall", "type": "Shop", "color": "#a78bfa", "description": "Large retail complex with diverse stores."},
            {"name": "Office Tower", "type": "Building", "color": "#60a5fa", "description": "Modern office building housing various businesses."}
        ]
    },
    "residential": {
        "buildings": [
            {"name": "Apartment Complex", "type": "Building", "color": "#8b5cf6", "description": "Modern residential complex with amenities."},
            {"name": "Hotel District", "type": "Hotel", "color": "#06b6d4", "description": "Upscale hotels and accommodations."}
        ]
    },
    "green": {
        "buildings": [
            {"name": "Central Park", "type": "Park", "color": "#4ade80", "description": "Large urban park with recreational facilities."},
            {"name": "Botanical Gardens", "type": "Park", "color": "#4ade80", "description": "Beautiful gardens with diverse plant species."}
        ]
    },
    "transportation": {
        "buildings": [
            {"name": "Central Station", "type": "Building", "color": "#64748b", "description": "Main transportation hub connecting the city."},
            {"name": "Bus Terminal", "type": "Building", "color": "#64748b", "description": "Central bus station serving the city."}
        ]
    }
}

# Zone Templates for Corporate Campus
CORPORATE_ZONE_TEMPLATES = {
    "admin": {
        "buildings": [
            {"name": "Main Office Building", "type": "Building", "color": "#3b82f6", "description": "Corporate headquarters with executive offices."},
            {"name": "HR & Finance Block", "type": "Building", "color": "#1d4ed8", "description": "Administrative offices for HR and Finance departments."}
        ]
    },
    "research": {
        "buildings": [
            {"name": "Research Lab A", "type": "Building", "color": "#ef4444", "description": "Advanced research and development facility."},
            {"name": "Innovation Center", "type": "Building", "color": "#ef4444", "description": "Collaborative space for innovation and prototyping."}
        ]
    },
    "conference": {
        "buildings": [
            {"name": "Main Conference Hall", "type": "Building", "color": "#84cc16", "description": "Large conference facility for corporate events."},
            {"name": "Training Center", "type": "Building", "color": "#fb923c", "description": "Employee training and development center."}
        ]
    },
    "cafeteria": {
        "buildings": [
            {"name": "Main Cafeteria", "type": "Restaurant", "color": "#a78bfa", "description": "Central dining facility for employees."},
            {"name": "Coffee Shop", "type": "Cafe", "color": "#60a5fa", "description": "Casual coffee shop and break area."}
        ]
    },
    "clinic": {
        "buildings": [
            {"name": "Medical Center", "type": "Hospital", "color": "#8b5cf6", "description": "On-site medical facility for employees."}
        ]
    },
    "parking": {
        "buildings": [
            {"name": "Main Parking Structure", "type": "Building", "color": "#4ade80", "description": "Multi-level employee parking facility."},
            {"name": "Visitor Parking", "type": "Building", "color": "#4ade80", "description": "Dedicated visitor parking area."}
        ]
    },
    "security": {
        "buildings": [
            {"name": "Security Command Center", "type": "Building", "color": "#64748b", "description": "Main security operations center."},
            {"name": "Entry Gate Complex", "type": "Building", "color": "#64748b", "description": "Main entrance security checkpoint."}
        ]
    }
}


def calculate_distance(pos1: LocationPosition, pos2: LocationPosition) -> float:
    """Calculate Euclidean distance between two positions"""
    dx = pos2.x - pos1.x
    dy = pos2.y - pos1.y
    dz = pos2.z - pos1.z
    return math.sqrt(dx*dx + dy*dy + dz*dz)


def generate_radial_positions(num_zones: int, base_radius: float = 20.0) -> List[Tuple[float, float]]:
    """
    Generate positions in a radial pattern around center (0, 0)
    Returns list of (x, z) coordinates for each zone center
    """
    if num_zones == 0:
        return []
    
    if num_zones == 1:
        return [(0.0, 0.0)]  # Single zone at center
    
    positions = []
    angle_step = 2 * math.pi / num_zones
    
    for i in range(num_zones):
        angle = i * angle_step
        x = base_radius * math.cos(angle)
        z = base_radius * math.sin(angle)
        positions.append((x, z))
    
    return positions


def generate_project_layout(
    model_type: ModelType,
    sectors: List[str]
) -> Tuple[List[LocationEmbedded], List[RoadEmbedded]]:
    """
    Generate a procedural city/campus layout based on selected sectors
    
    Args:
        model_type: Type of project (planning or corporate)
        sectors: List of zone types to include
    
    Returns:
        Tuple of (locations, roads)
    """
    
    # Select appropriate templates
    templates = CITY_ZONE_TEMPLATES if model_type == ModelType.PLANNING else CORPORATE_ZONE_TEMPLATES
    
    # Validate sectors
    valid_sectors = [s for s in sectors if s in templates]
    if not valid_sectors:
        raise ValueError(f"No valid sectors provided for {model_type.value} model")
    
    # Generate zone positions using radial layout
    zone_positions = generate_radial_positions(len(valid_sectors), base_radius=20.0)
    
    locations: List[LocationEmbedded] = []
    location_map: Dict[str, LocationEmbedded] = {}  # For road generation
    
    # Generate locations for each sector
    for zone_idx, sector in enumerate(valid_sectors):
        zone_template = templates[sector]
        zone_center_x, zone_center_z = zone_positions[zone_idx]
        
        buildings = zone_template["buildings"]
        
        # Position buildings within the zone (small offset from zone center)
        for building_idx, building_template in enumerate(buildings):
            # Create slight offset for multiple buildings in same zone
            offset_angle = (building_idx * math.pi / 4) if len(buildings) > 1 else 0
            offset_distance = 3.0 if len(buildings) > 1 else 0
            
            x = zone_center_x + offset_distance * math.cos(offset_angle)
            z = zone_center_z + offset_distance * math.sin(offset_angle)
            
            # Generate unique ID
            location_id = f"{sector}_{building_idx + 1}"
            
            location = LocationEmbedded(
                id=location_id,
                name=building_template["name"],
                type=building_template["type"],
                position=LocationPosition(x=x, y=0.0, z=z),
                description=building_template["description"],
                color=building_template["color"],
                zone=sector
            )
            
            locations.append(location)
            location_map[location_id] = location
    
    # Generate roads
    roads: List[RoadEmbedded] = []
    
    # Create a central hub (first location, usually government/admin)
    if locations:
        hub_location = locations[0]
        
        # Connect hub to first building of each other zone (main roads)
        zone_representatives = {}
        for loc in locations:
            if loc.zone not in zone_representatives:
                zone_representatives[loc.zone] = loc
        
        for zone, representative in zone_representatives.items():
            if representative.id != hub_location.id:
                distance = calculate_distance(hub_location.position, representative.position)
                road_id = f"r_main_{hub_location.id}_{representative.id}"
                
                roads.append(RoadEmbedded(
                    id=road_id,
                    from_location=hub_location.id,
                    to_location=representative.id,
                    distance=round(distance, 2),
                    type="main"
                ))
        
        # Connect buildings within same zone (secondary roads)
        zones_dict: Dict[str, List[LocationEmbedded]] = {}
        for loc in locations:
            if loc.zone not in zones_dict:
                zones_dict[loc.zone] = []
            zones_dict[loc.zone].append(loc)
        
        for zone, zone_locations in zones_dict.items():
            if len(zone_locations) > 1:
                # Connect consecutive buildings in the zone
                for i in range(len(zone_locations) - 1):
                    loc1 = zone_locations[i]
                    loc2 = zone_locations[i + 1]
                    distance = calculate_distance(loc1.position, loc2.position)
                    road_id = f"r_sec_{loc1.id}_{loc2.id}"
                    
                    roads.append(RoadEmbedded(
                        id=road_id,
                        from_location=loc1.id,
                        to_location=loc2.id,
                        distance=round(distance, 2),
                        type="secondary"
                    ))
    
    return locations, roads
