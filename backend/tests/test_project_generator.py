"""Unit tests for project generation service"""
import pytest
from app.services.project_generator import (
    generate_project_layout,
    generate_radial_positions,
    calculate_distance,
    CITY_ZONE_TEMPLATES,
    CORPORATE_ZONE_TEMPLATES
)
from app.models.project import ModelType
from app.models.location import LocationPosition


class TestRadialPositionGeneration:
    """Test radial position generation algorithm"""
    
    def test_no_zones(self):
        """Test with zero zones"""
        positions = generate_radial_positions(0)
        assert len(positions) == 0
    
    def test_single_zone(self):
        """Test with single zone (should be at center)"""
        positions = generate_radial_positions(1)
        assert len(positions) == 1
        assert positions[0] == (0.0, 0.0)
    
    def test_multiple_zones(self):
        """Test with multiple zones (should form circle)"""
        positions = generate_radial_positions(4, base_radius=10.0)
        assert len(positions) == 4
        
        # Verify all positions are roughly same distance from center
        distances = []
        for x, z in positions:
            distance = (x**2 + z**2) ** 0.5
            distances.append(distance)
        
        # All distances should be approximately equal to base_radius
        for dist in distances:
            assert abs(dist - 10.0) < 0.01  # Allow small floating point error
    
    def test_custom_radius(self):
        """Test with custom base radius"""
        positions = generate_radial_positions(6, base_radius=25.0)
        assert len(positions) == 6
        
        # Verify radius
        for x, z in positions:
            distance = (x**2 + z**2) ** 0.5
            assert abs(distance - 25.0) < 0.01


class TestDistanceCalculation:
    """Test distance calculation between positions"""
    
    def test_same_position(self):
        """Distance between same position should be 0"""
        pos1 = LocationPosition(x=5.0, y=0.0, z=5.0)
        pos2 = LocationPosition(x=5.0, y=0.0, z=5.0)
        
        distance = calculate_distance(pos1, pos2)
        assert distance == 0.0
    
    def test_horizontal_distance(self):
        """Test horizontal distance calculation"""
        pos1 = LocationPosition(x=0.0, y=0.0, z=0.0)
        pos2 = LocationPosition(x=10.0, y=0.0, z=0.0)
        
        distance = calculate_distance(pos1, pos2)
        assert distance == 10.0
    
    def test_vertical_distance(self):
        """Test vertical distance calculation"""
        pos1 = LocationPosition(x=0.0, y=0.0, z=0.0)
        pos2 = LocationPosition(x=0.0, y=5.0, z=0.0)
        
        distance = calculate_distance(pos1, pos2)
        assert distance == 5.0
    
    def test_3d_distance(self):
        """Test 3D Euclidean distance"""
        pos1 = LocationPosition(x=0.0, y=0.0, z=0.0)
        pos2 = LocationPosition(x=3.0, y=4.0, z=0.0)
        
        distance = calculate_distance(pos1, pos2)
        assert distance == 5.0  # 3-4-5 triangle


class TestProjectLayoutGeneration:
    """Test full project layout generation"""
    
    def test_city_planning_generation(self):
        """Test city planning layout generation"""
        sectors = ["government", "healthcare", "education"]
        
        locations, roads = generate_project_layout(
            model_type=ModelType.PLANNING,
            sectors=sectors
        )
        
        # Verify locations were generated
        assert len(locations) > 0
        
        # Verify each sector has locations
        generated_zones = set(loc.zone for loc in locations)
        for sector in sectors:
            assert sector in generated_zones
        
        # Verify location structure
        for location in locations:
            assert location.id is not None
            assert location.name is not None
            assert location.type is not None
            assert location.position is not None
            assert location.zone in sectors
            assert location.color is not None
        
        # Verify roads were generated
        assert len(roads) > 0
        
        # Verify road structure
        for road in roads:
            assert road.id is not None
            assert road.from_location is not None
            assert road.to_location is not None
            assert road.distance > 0
            assert road.type in ["main", "secondary"]
    
    def test_corporate_campus_generation(self):
        """Test corporate campus layout generation"""
        sectors = ["admin", "research", "cafeteria", "parking"]
        
        locations, roads = generate_project_layout(
            model_type=ModelType.CORPORATE,
            sectors=sectors
        )
        
        # Verify locations were generated
        assert len(locations) > 0
        
        # Verify each sector has locations
        generated_zones = set(loc.zone for loc in locations)
        for sector in sectors:
            assert sector in generated_zones
        
        # Verify corporate-specific building types
        building_types = set(loc.type for loc in locations)
        assert "Building" in building_types  # Most corporate buildings are generic
    
    def test_single_sector_generation(self):
        """Test generation with single sector"""
        sectors = ["government"]
        
        locations, roads = generate_project_layout(
            model_type=ModelType.PLANNING,
            sectors=sectors
        )
        
        # Should still generate locations
        assert len(locations) > 0
        
        # All locations should be in the single sector
        for location in locations:
            assert location.zone == "government"
        
        # Roads might be limited with single sector
        assert isinstance(roads, list)
    
    def test_invalid_sectors(self):
        """Test generation with invalid sectors raises error"""
        invalid_sectors = ["invalid_zone_1", "invalid_zone_2"]
        
        with pytest.raises(ValueError, match="No valid sectors"):
            generate_project_layout(
                model_type=ModelType.PLANNING,
                sectors=invalid_sectors
            )
    
    def test_mixed_valid_invalid_sectors(self):
        """Test generation with mix of valid and invalid sectors"""
        mixed_sectors = ["government", "invalid_zone", "healthcare"]
        
        # Should succeed with valid sectors only
        locations, roads = generate_project_layout(
            model_type=ModelType.PLANNING,
            sectors=mixed_sectors
        )
        
        # Verify only valid sectors generated
        generated_zones = set(loc.zone for loc in locations)
        assert "government" in generated_zones
        assert "healthcare" in generated_zones
        assert "invalid_zone" not in generated_zones
    
    def test_all_city_sectors(self):
        """Test generation with all available city sectors"""
        all_sectors = list(CITY_ZONE_TEMPLATES.keys())
        
        locations, roads = generate_project_layout(
            model_type=ModelType.PLANNING,
            sectors=all_sectors
        )
        
        # Should generate locations for all sectors
        generated_zones = set(loc.zone for loc in locations)
        assert len(generated_zones) == len(all_sectors)
        
        # Should generate many locations
        assert len(locations) >= len(all_sectors)
        
        # Should generate many roads
        assert len(roads) > 0
    
    def test_all_corporate_sectors(self):
        """Test generation with all available corporate sectors"""
        all_sectors = list(CORPORATE_ZONE_TEMPLATES.keys())
        
        locations, roads = generate_project_layout(
            model_type=ModelType.CORPORATE,
            sectors=all_sectors
        )
        
        # Should generate locations for all sectors
        generated_zones = set(loc.zone for loc in locations)
        assert len(generated_zones) == len(all_sectors)
        
        # Should generate many locations
        assert len(locations) >= len(all_sectors)
    
    def test_road_connectivity(self):
        """Test that roads connect existing locations"""
        sectors = ["government", "healthcare", "education"]
        
        locations, roads = generate_project_layout(
            model_type=ModelType.PLANNING,
            sectors=sectors
        )
        
        # Get all location IDs
        location_ids = set(loc.id for loc in locations)
        
        # Verify all roads connect existing locations
        for road in roads:
            assert road.from_location in location_ids
            assert road.to_location in location_ids
            assert road.from_location != road.to_location  # No self-loops
    
    def test_building_count_per_zone(self):
        """Test that each zone generates correct number of buildings"""
        sectors = ["government", "healthcare"]
        
        locations, roads = generate_project_layout(
            model_type=ModelType.PLANNING,
            sectors=sectors
        )
        
        # Count buildings per zone
        zone_counts = {}
        for location in locations:
            zone_counts[location.zone] = zone_counts.get(location.zone, 0) + 1
        
        # Verify each sector has the correct number of buildings
        # Government has 2 buildings in template
        assert zone_counts.get("government", 0) == 2
        # Healthcare has 2 buildings in template
        assert zone_counts.get("healthcare", 0) == 2
