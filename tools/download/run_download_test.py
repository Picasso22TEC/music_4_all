import requests, time, sys
BASE='http://localhost:8000'
track_id = int(sys.argv[1]) if len(sys.argv) > 1 else 184996158
print('Starting download job for track',track_id)
try:
    r=requests.post(BASE+'/api/v1/download/start',json={'track_id':track_id,'folder_name':''},timeout=10)
    print('start',r.status_code, r.text)
    job_id=r.json().get('job_id')
    print('job id', job_id)
except Exception as e:
    print('Failed to start job:',e)
    sys.exit(1)

for i in range(600):
    try:
        s=requests.get(BASE+f'/api/v1/download/{job_id}',timeout=10)
        data=s.json()
        print(i, data.get('status'), data.get('progress'), data.get('quality_text'))
        sys.stdout.flush()
        if data.get('status') in ('done','error'):
            print('FINAL',data)
            break
    except Exception as e:
        print('poll error',e)
    time.sleep(1)
