
import argparse
import sys
from datetime import timedelta
from pathlib import Path

# pip3 install srt
import srt


def nearest(items, pivot):
    return min(items, key=lambda x: abs(x.start - pivot))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Merge SRT subtitles',
                                     usage="""
    Merge SRT subtitles:                                     
    \t{0} file1.srt file2.srt [file3.srt ...] -o merged.srt
 """.format(Path(sys.argv[0]).name))

    parser.add_argument('srt_files', nargs='+',
                        help='SRT file paths')
    parser.add_argument('--output-file', '-o',
                        default=None,
                        help='Output filename')
    args = parser.parse_args(sys.argv[1:])

    all_subs = []
    for srt_path in args.srt_files:
        path = Path(srt_path)
        with path.open(encoding='utf-8') as fi:
            subs = [s for s in srt.parse(fi)]
            all_subs.extend(subs)

    # sort all subs by start time
    sorted_by_start_time = sorted(all_subs, key=lambda x: x.start)

    # re create the index
    for idx, sub in enumerate(sorted_by_start_time):
        sub.index = idx + 1

    if not args.output_file:
        first_srt_path = Path(args.srt_files[0])
        generated_srt = first_srt_path.parent / (f'{first_srt_path.stem}_MERGED{first_srt_path.suffix}')
    else:
        generated_srt = Path(args.output_file)
    
    with generated_srt.open(mode='w', encoding='utf-8') as fout:
        fout.write(srt.compose(list(sorted_by_start_time)))

