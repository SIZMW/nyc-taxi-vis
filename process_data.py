import os
import json
import csv
from datetime import datetime, timedelta
from collections import namedtuple
from loading_bar import *


Point = namedtuple('Point', ('x', 'y'))
TaxiZone = namedtuple('TaxiZone', ('locID', 'polygons'))

def is_point_in_zone(point, zone):
    for poly in zone.polygons:
        # https://en.wikipedia.org/wiki/Even%E2%80%93odd_rule
        inside = False
        for i in range(len(poly)):
            p1 = poly[i]
            p2 = poly[i - 1]
            if ((p1.y > point.y) != (p2.y > point.y)) and (point.x < (p2.x - p1.x) * (point.y - p1.y) / (p2.y - p1.y) + p1.x):
                inside = not inside
        if inside:
            return True
    return False

def process_zones(zones_path):
    with open(zones_path, 'r') as f:
        zones_json = json.load(f)

    zones = []

    for feature in zones_json['features']:
        geom_type = feature['geometry']['type']

        if geom_type == 'Polygon':
            polygons_json = [feature['geometry']['coordinates']]
        elif geom_type == 'MultiPolygon':
            polygons_json = feature['geometry']['coordinates']
        else:
            raise ValueError('unknown geometry type {}'.format(geom_type))

        polygons = [[Point(*p) for p in poly[0]] for poly in polygons_json]

        zones.append(TaxiZone(feature['properties']['LocationID'], polygons))

    return zones

def file_lines(fname):
    with open(fname) as f:
        for i, l in enumerate(f):
            pass
    return i + 1

def process_data(data_folder, zones_path, output_path):
    zones = process_zones(zones_path)

    def get_zone_id(point):
        for zone in zones:
            if is_point_in_zone(point, zone):
                return zone.locID
        return None

    data_files = [os.path.join(data_folder, data_file) for data_file in os.listdir(data_folder)]

    print('Counting records in {:,d} files...'.format(len(data_files)))
    record_count = 0
    loading_bar_init(len(data_files))
    for data_file in data_files:
        record_count += file_lines(data_file)
        loading_bar_update()
    loading_bar_finish()

    date_formats = ('%m/%d/%Y %H:%M', '%Y-%m-%d %H:%M:%S')
    def parse_date(s):
        for date_format in date_formats:
            try:
                return datetime.strptime(s, date_format)
            except ValueError:
                pass
        raise ValueError('{} does not match any formats'.format(s))

    zone_times = {}

    record_limit = 20000
    records_processed = 0

    print('Processing {:,d} records...'.format(record_count))
    loading_bar_init(record_limit)
    for data_file in data_files:
        with open(data_file, 'r') as f:
            r = csv.reader(f)
            next(r) # skip header
            for row in r:
                if records_processed >= record_limit: break
                records_processed += 1
                loading_bar_update()
                if not row: continue
                pickup_date = parse_date(row[1])
                dropoff_date = parse_date(row[2])
                pickup_loc = Point(float(row[5]), float(row[6]))
                dropoff_loc = Point(float(row[9]), float(row[10]))

                if pickup_loc == Point(0, 0): continue
                if dropoff_loc == Point(0, 0): continue

                trip_time = (dropoff_date - pickup_date) / timedelta(minutes=1)
                if trip_time < 1: continue

                pickup_zone = get_zone_id(pickup_loc)
                dropoff_zone = get_zone_id(dropoff_loc)
                if pickup_zone is None or dropoff_zone is None: continue
                if pickup_zone == dropoff_zone: continue

                if pickup_zone in zone_times and dropoff_zone in zone_times[pickup_zone]:
                    zone_times[pickup_zone][dropoff_zone]['average'] += trip_time
                    zone_times[pickup_zone][dropoff_zone]['count'] += 1
                elif dropoff_zone in zone_times and pickup_zone in zone_times[dropoff_zone]:
                    zone_times[dropoff_zone][pickup_zone]['average'] += trip_time
                    zone_times[dropoff_zone][pickup_zone]['count'] += 1
                else:
                    if pickup_zone not in zone_times: zone_times[pickup_zone] = {}
                    if dropoff_zone not in zone_times[pickup_zone]: zone_times[pickup_zone][dropoff_zone] = {}
                    zone_times[pickup_zone][dropoff_zone]['average'] = trip_time
                    zone_times[pickup_zone][dropoff_zone]['count'] = 1

    loading_bar_finish()

    for zone1 in zone_times:
        for zone2 in zone_times[zone1]:
            zone_times[zone1][zone2]['average'] /= zone_times[zone1][zone2]['count']

    with open(output_path, 'w') as f:
        json.dump(zone_times, f)


if __name__ == '__main__':
    def directory(path):
        path = os.path.abspath(path)
        if not os.path.isdir(path):
            raise ValueError('path {} is not a directory'.format(path))
        return path

    def file(path):
        path = os.path.abspath(path)
        if not os.path.isfile(path):
            raise ValueError('path {} is not a file'.format(path))
        return path

    def writable_file(path):
        path = os.path.abspath(path)
        return path

    from argparse import ArgumentParser
    parser = ArgumentParser()
    parser.add_argument('data_folder', type=directory)
    parser.add_argument('zones_path', type=file)
    parser.add_argument('output_path', type=writable_file)
    args = parser.parse_args()

    process_data(args.data_folder, args.zones_path, args.output_path)
