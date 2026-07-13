import asyncio
import websockets
import json

async def test():
    try:
        async with websockets.connect('ws://localhost:8080/ws/companion') as ws:
            print('[WS] Connected!')
            msg = await asyncio.wait_for(ws.recv(), timeout=5)
            data = json.loads(msg)
            print('[WS] Server:', data)

            await ws.send(json.dumps({'text': 'Hola Dominus, como estas?'}))
            print('[WS] Sent text')

            for i in range(15):
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=10)
                    data = json.loads(msg)
                    keys = list(data.keys())
                    print('[WS] Received:', keys)
                    if 'text' in data:
                        print('  text:', data['text'][:200])
                    if 'audio' in data:
                        print('  audio:', len(data['audio']), 'chars base64')
                    if 'turnComplete' in data:
                        print('  TURN COMPLETE!')
                        break
                except asyncio.TimeoutError:
                    print(f'  timeout on msg {i}')
                    break
        print('[TEST] DONE')
    except Exception as e:
        print(f'[WS] Error: {e}')
        import traceback
        traceback.print_exc()

asyncio.run(test())
