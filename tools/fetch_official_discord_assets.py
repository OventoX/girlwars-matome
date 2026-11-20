import io
import os
import urllib.request
from PIL import Image

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'app', 'assets', 'official')
os.makedirs(OUT_DIR, exist_ok=True)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
}

ITEMS = [
    ("rimuru_ursen_アストルフォ", "https://cdn.discordapp.com/attachments/1547812162401996890/1547812162716565605/40adadf286bd0105.jpg?ex=6b0110e8&is=6affbf68&hm=f40082b17c6d4343d8489beb3569e1763685035ebfc40985f4c99082095547c4", "rimuru_ursen_アストルフォ_main.jpg", "https://cdn.discordapp.com/attachments/1547812162401996890/1547812400655376414/bfa2648d3011191f.png?ex=6b011121&is=6affbfa1&hm=e87f91139121a623fd71e45bf19ed6ce9d0c926942185d1660cd66098c3f101b", "rimuru_ursen_アストルフォ_info.webp"),
    ("rimuru_ursen_オジマンディアス", "https://cdn.discordapp.com/attachments/1550103219756208154/1550103220083236934/7c8a84fd908e4603.jpg?ex=6b017d9f&is=6b002c1f&hm=00d9baf75f340fda07202ca1d8e2937fbfa24ced63f6774ebdda9a547e3b750c", "rimuru_ursen_オジマンディアス_main.jpg", "https://cdn.discordapp.com/attachments/1550103219756208154/1550103316749361152/d95a091bd112ab3f.png?ex=6b017db6&is=6b002c36&hm=170dcff14c3230f85382d612d3d42b35d5717d548f629724b282d78cb01f6148", "rimuru_ursen_オジマンディアス_info.webp"),
    ("rimuru_ursen_オデュッセウス", "https://cdn.discordapp.com/attachments/1547817215254855700/1547817216060297266/7501.jpg?ex=6b01159d&is=6affc41d&hm=42b4113a20db4d711ae23e9d62c9f3d7c9f59488825559709baa36c5830d6f95", "rimuru_ursen_オデュッセウス_main.jpg", "https://cdn.discordapp.com/attachments/1547817215254855700/1547817452212326400/50e094868508eb15.png?ex=6b0115d5&is=6affc455&hm=3994450ae69a8773948f665d8988297c30af156c33b17dd37b54c0a2d21021d3", "rimuru_ursen_オデュッセウス_info.webp"),
    ("rimuru_ursen_オベロン", "https://cdn.discordapp.com/attachments/1547132883041259531/1547132883314151568/d8864dff599cf002.jpg?ex=6b013b47&is=6affe9c7&hm=0dd130eb5219ed7b89ed6ebf56729f8c5c4f4c833c18bc12eccde20231bf1a03", "rimuru_ursen_オベロン_main.jpg", "https://cdn.discordapp.com/attachments/1547132883041259531/1547133745084235796/17889357138476.png?ex=6b013c15&is=6affea95&hm=505f9c73f57d71e07f99700d1c1662d139cc76f01648a5c30a73ae08ad0db427", "rimuru_ursen_オベロン_info.webp"),
    ("rimuru_ursen_カエサル", "https://cdn.discordapp.com/attachments/1547818225725739008/1547818226015277158/40526921ae43c3c0.png?ex=6b01168e&is=6affc50e&hm=5fd958154f74b5e192294f03ba16168b315c0cfd016ecacae49592301e4e9f97", "rimuru_ursen_カエサル_main.png", "https://cdn.discordapp.com/attachments/1547818225725739008/1547818741935382689/def76e16a70b1d6c.png?ex=6b011709&is=6affc589&hm=494e4437abe82d1b1f359396a26d5e643ce04609eddd4a22e72a9e64acbf7bf8", "rimuru_ursen_カエサル_info.webp"),
    ("rimuru_ursen_果心居士", "https://cdn.discordapp.com/attachments/1547811599362818088/1547811599606222908/096bb84934cb9ea1.jpg?ex=6b011062&is=6affbee2&hm=2ce7a7434883b8687537eaf4b54d762d7e77ba1c8975c95f264df07b17d4ae1f", "rimuru_ursen_果心居士_main.jpg", "https://cdn.discordapp.com/attachments/1547811599362818088/1547811924329103432/c5baee7c37009c84.png?ex=6b0110af&is=6affbf2f&hm=14350a72ac0699a95a17fcf5f598d4ebe13f9fd92d6fdac43c37b5976fa93525", "rimuru_ursen_果心居士_info.webp"),
    ("rimuru_ursen_上泉信綱", "https://cdn.discordapp.com/attachments/1407617865095577642/1407617865640710194/5891.jpg?ex=6b013f4b&is=6affedcb&hm=7d10f0297710514f297548485ab0d43a5440fc9cd1a4f5b805aa0149dc4661ac", "rimuru_ursen_上泉信綱_main.jpg", "https://cdn.discordapp.com/attachments/1407617865095577642/1407617937866620988/URR.png?ex=6b013f5c&is=6affeddc&hm=bbd40adfac58b84410e48adf00902f9e60dfa613d2a34d90a18eed900d2edccf", "rimuru_ursen_上泉信綱_info.webp"),
    ("rimuru_ursen_ガウェイン", "https://cdn.discordapp.com/attachments/1407625390918467584/1407625391199223839/6463.jpg?ex=6b01464d&is=6afff4cd&hm=c63f1db0f25a4888e43c312bd8d729aacf3566b627838cd201e1cac3658e8ad9", "rimuru_ursen_ガウェイン_main.jpg", "https://cdn.discordapp.com/attachments/1407625390918467584/1407984622201081856/URR_1.png?ex=6b01435d&is=6afff1dd&hm=805dd6f72a95a9689ac5249d723577e24530dc357eba846eb4a6412444cfb07e", "rimuru_ursen_ガウェイン_info.webp"),
    ("rimuru_ursen_真田幸村", "https://cdn.discordapp.com/attachments/1547838040955686922/1547838041232777257/265.jpg?ex=6b012902&is=6affd782&hm=2c9daaf491526133ddcebe22b9cb70d4c1fd3ec12f59e035eff31da7251294e1", "rimuru_ursen_真田幸村_main.jpg", "https://cdn.discordapp.com/attachments/1547838040955686922/1547838341846794350/ebfc3e0540e155d5.png?ex=6b01294a&is=6affd7ca&hm=0fa771de5561d472864ddee654210cf8a0e907882fd61d93ab4f23c2e6191629", "rimuru_ursen_真田幸村_info.webp"),
    ("rimuru_ursen_三蔵法師", "https://cdn.discordapp.com/attachments/1547817660627161158/1547817661163905066/7531.jpg?ex=6b011607&is=6affc487&hm=7d308edb59380be612a22920e5d785026cc5b87a03c4cfa0a38bd967660f67b6", "rimuru_ursen_三蔵法師_main.jpg", "https://cdn.discordapp.com/attachments/1547817660627161158/1547817895973756958/15a82c3bb0076a31.png?ex=6b01163f&is=6affc4bf&hm=b72073abb5465481dd4d78aba55ff66c933661883de2003a255bbc01f499a2bd", "rimuru_ursen_三蔵法師_info.webp"),
    ("rimuru_ursen_ソロモン", "https://cdn.discordapp.com/attachments/1547808605112238133/1547808605577682964/ur.jpg?ex=6b010d98&is=6affbc18&hm=e021cd7340dbda7af9a35546bff02722d135f32eba8bfbcd2a84da8de5af31bb", "rimuru_ursen_ソロモン_main.jpg", "https://cdn.discordapp.com/attachments/1547808605112238133/1547808648162451456/487707783b2f8978.png?ex=6b010da2&is=6affbc22&hm=13b9a47855871bad496057e818d4a387dc684c8c7f5418b21cb4c11fa1580b6d", "rimuru_ursen_ソロモン_info.webp"),
    ("rimuru_ursen_玉藻前", "https://cdn.discordapp.com/attachments/1367348148770570341/1367348151228567712/Gpsd0jka8AAVTv9.jpg?ex=6b0115b3&is=6affc433&hm=aa4e172518aa4f9e099d1dc1eb10933fd5bd56dd0490691ca70e19bc68cf5be9", "rimuru_ursen_玉藻前_main.jpg", "https://cdn.discordapp.com/attachments/1367348148770570341/1367348350764056596/2.png?ex=6b0115e2&is=6affc462&hm=3201d1b28243c9291b5b198d3aa1fdaf90f921710a026f38f2663e51a9dc904b", "rimuru_ursen_玉藻前_info.webp"),
    ("rimuru_ursen_伊達政宗", "https://cdn.discordapp.com/attachments/1432247949265469451/1432247949571919913/6851.jpg?ex=6b0133d9&is=6affe259&hm=1f2d53dc2ef3d58e68349d565c3d4a4dafc71c918b637f429c26642e7217cf5c", "rimuru_ursen_伊達政宗_main.jpg", "https://cdn.discordapp.com/attachments/1432247949265469451/1432248165767188510/URR.png?ex=6b01340c&is=6affe28c&hm=c21bea94a27dd0fefcfa57fde28539c52bd6f06dca258d52dc1342431d5b4917", "rimuru_ursen_伊達政宗_info.webp"),
    ("rimuru_ursen_塚原卜伝", "https://cdn.discordapp.com/attachments/1547836522932346990/1547836523179679784/7741.jpg?ex=6b012798&is=6affd618&hm=ec953bd33cfae17a51512633e163fffbed9611880799bb6e7639230e3522bd82", "rimuru_ursen_塚原卜伝_main.jpg", "https://cdn.discordapp.com/attachments/1547836522932346990/1547836768299122758/3d0c04d6b38680b8.png?ex=6b0127d2&is=6affd652&hm=71f9eb3f6da3661a605d819c1d08bc3be3587b27baee48408992a2de59ed63cf", "rimuru_ursen_塚原卜伝_info.webp"),
    ("rimuru_ursen_巴御前", "https://cdn.discordapp.com/attachments/1561645042693570590/1561645042907611136/image.jpg?ex=6b014ac8&is=6afff948&hm=b0d7321c41731bbcdb62070ef483453375dcf93b94208f48e1038701d40cb3fa", "rimuru_ursen_巴御前_main.jpg", "https://cdn.discordapp.com/attachments/1561645042693570590/1561645767570104340/9b50316f5eeff79b.png?ex=6b014b74&is=6afff9f4&hm=5f36065c7aa0e05ee908de3db48e6232a3ee9fa4d01473d195062dc3a1ae79f7", "rimuru_ursen_巴御前_info.webp"),
    ("rimuru_ursen_源頼光", "https://cdn.discordapp.com/attachments/1547816610578956408/1547816610964836422/7331.jpg?ex=6b01150d&is=6affc38d&hm=a371e93c9cf1b71847e1704fc07d985a6d305c8c4a50b0d5c5cda6b7a143fe4f", "rimuru_ursen_源頼光_main.jpg", "https://cdn.discordapp.com/attachments/1547816610578956408/1547816879954071682/b5f620956d0b7c1a.png?ex=6b01154d&is=6affc3cd&hm=bde2e7aaec7a6ff0fedb15221768927577d7e9cf0bbcea078a6d626388bf702e", "rimuru_ursen_源頼光_info.webp"),
    ("rimuru_ursen_メイヴ", "https://cdn.discordapp.com/attachments/1567055927884914689/1567055928178774120/bf2b52c1762db6b8.jpg?ex=6b01338f&is=6affe20f&hm=723cf3758cb1d64534a4cb8bac2609064633c31af5b102e082293fb4dc1e8d24", "rimuru_ursen_メイヴ_main.jpg", "https://cdn.discordapp.com/attachments/1567055927884914689/1567068914846801940/URR_01.png?ex=6b013fa8&is=6affee28&hm=10da4ccaef51f01d0e8ab5f277d284a22287ea360a205797460a553174dded44", "rimuru_ursen_メイヴ_info.webp"),
    ("rimuru_ursen_リチャード", "https://cdn.discordapp.com/attachments/1547808825443225661/1547808825761996820/77af056b5180a381.jpg?ex=6b010dcc&is=6affbc4c&hm=5e69f2c1fd2850b81bdd5d3dccc390e1d1dfa3512f2a1af5c703c3401bb16123", "rimuru_ursen_リチャード_main.jpg", "https://cdn.discordapp.com/attachments/1547808825443225661/1547809478106284032/e78a489c1908060d.png?ex=6b010e68&is=6affbce8&hm=0462b343ee6407f0e673e5be146f41074ced52447333c271cb6368b0ffba10e4", "rimuru_ursen_リチャード_info.webp"),
    ("rimuru_ursen_劉邦", "https://cdn.discordapp.com/attachments/1547807404572409856/1547807404870078625/ur.jpg?ex=6b010c7a&is=6affbafa&hm=9224dddc2e9ebef195bb5c3431fc4f4fccc9f1632f221603e351fac408ba41fa", "rimuru_ursen_劉邦_main.jpg", "https://cdn.discordapp.com/attachments/1547807404572409856/1547807690011443270/3a650e937a0988d1.png?ex=6b010cbe&is=6affbb3e&hm=74bac4d8341b0a7fabaf2c0bbfc7bc7276936a2daefdf0b62461762305c7f6df", "rimuru_ursen_劉邦_info.webp"),
    ("rimuru_ursen_ローラン", "https://cdn.discordapp.com/attachments/1557572957822517270/1557572958443278447/39d7079de99ffe45.jpg?ex=6b00fadb&is=6affa95b&hm=fdfae530591d41d05fe0f0a560cd8b7725b0c60252dc6a51bda8e08668f0b1c3", "rimuru_ursen_ローラン_main.jpg", "https://cdn.discordapp.com/attachments/1557572957822517270/1557574127739609108/image.png?ex=6b00fbf2&is=6affaa72&hm=c93e0944c416287b3687dae73df4d3f2f29ae25a6b93d76b11e5d3117d2b7978", "rimuru_ursen_ローラン_info.webp"),
    ("rimuru_ursen_ダ・ヴィンチ", "https://cdn.discordapp.com/attachments/1407619633544171605/1407619633749557278/6301.jpg?ex=6b0140f0&is=6affef70&hm=bb2b9602be96b677d66479df06e32d80c888dc186217499317cc159a5bdf7e46", "rimuru_ursen_ダ・ヴィンチ_main.jpg", "https://cdn.discordapp.com/attachments/1407619633544171605/1407619850175516692/URR.png?ex=6b014124&is=6affefa4&hm=db046dd977c456a6a023f47108859cdd47657c364a7c78d9633d28f507138877", "rimuru_ursen_ダ・ヴィンチ_info.webp"),
    ("rimuru_ursen_ハンニバル・バルカ", "https://cdn.discordapp.com/attachments/1547837504965578782/1547837505259184229/796112.jpg?ex=6b012882&is=6affd702&hm=f47f703418a9b442792e31adb955b240919f2b739d826790ada8f6a7d2fc6170", "rimuru_ursen_ハンニバル・バルカ_main.jpg", "https://cdn.discordapp.com/attachments/1547837504965578782/1547837696096079962/9d50d2bc9512f2a4.png?ex=6b0128b0&is=6affd730&hm=76b0ab0e63397c37a921ae231e663747892fbe95857d59f3394f22c388181eed", "rimuru_ursen_ハンニバル・バルカ_info.webp"),
    ("rimuru_ursen_モーガン", "https://cdn.discordapp.com/attachments/1547837030711566336/1547837031009353799/7941.jpg?ex=6b012811&is=6affd691&hm=f62fdae9cc9390492de811ff4b518e4d9b61ef24d6030feac024668d3331ae4c", "rimuru_ursen_モーガン_main.jpg", "https://cdn.discordapp.com/attachments/1547837030711566336/1547837243522285568/b6cd1657b7ed275c.png?ex=6b012844&is=6affd6c4&hm=45e38f511d30ab54d14f6a87b6c300b1c0a955b28222385bfd48f287b2e99ec6", "rimuru_ursen_モーガン_info.webp"),
    ("rimuru_ur_アキレウス", "https://cdn.discordapp.com/attachments/1345243040947638355/1345243041212141578/253UR.jpg?ex=6b011636&is=6affc4b6&hm=f0630e2fcf2e62ac697f68ca4a231a9f6e9ce2f2f90127ac4f2efb2bf0f5ac56", "rimuru_ur_アキレウス_main.jpg", "https://cdn.discordapp.com/attachments/1345243040947638355/1345243165921120256/253UR.png?ex=6b011654&is=6affc4d4&hm=1e3a65fec06b963e5055ebe625390883a0ceb8100cd9ae57beabc286594996fc", "rimuru_ur_アキレウス_info.webp"),
    ("rimuru_ur_アッティラ", "https://cdn.discordapp.com/attachments/1235393308637794336/1235393309107552266/263.jpg?ex=6b0193ed&is=6b00426d&hm=5fc312b0c1505befe8fe2f4fc95107926959192319eddf83f3f7c25761a2ed72", "rimuru_ur_アッティラ_main.jpg", "https://cdn.discordapp.com/attachments/1235393308637794336/1235393470101721189/1.png?ex=6b019413&is=6b004293&hm=e884d5bbec51c4f8dc8d7403fcad396f9ab5d66d7f6a25397d3ed8bcf7f540b3", "rimuru_ur_アッティラ_info.webp"),
    ("rimuru_ur_ガウェイン", "https://cdn.discordapp.com/attachments/1262968560557494373/1262968560867610694/3251.jpg?ex=6b010aa1&is=6affb921&hm=4004c7820ac9e9a0b8db9a327501ebe18a062c62c5f6bfa0cca4e171a6106e4c", "rimuru_ur_ガウェイン_main.jpg", "https://cdn.discordapp.com/attachments/1262968560557494373/1262968749997424660/1.png?ex=6b010ace&is=6affb94e&hm=26120acd78c04505e1bf7f3f7304a4c9f9437376a5953715d2ecc9717ac97a60", "rimuru_ur_ガウェイン_info.webp"),
    ("rimuru_ur_クーフーリン", "https://cdn.discordapp.com/attachments/1285423952151445544/1285423952390262864/3711.jpg?ex=6b00fed8&is=6affad58&hm=1e15e9495c8462dffa5e049f00b0a24823b9059f0ea6a766f832b1bc1857cb21", "rimuru_ur_クーフーリン_main.jpg", "https://cdn.discordapp.com/attachments/1285423952151445544/1285424049249587210/1.png?ex=6b00feef&is=6affad6f&hm=0c21ebdda3cc00a5a081c4249527f8e38bbfb44b34453446933be155a91d982d", "rimuru_ur_クーフーリン_info.webp"),
    ("rimuru_ur_長宗我部元親", "https://cdn.discordapp.com/attachments/1195558597132832798/1195558597464174602/83326c9ee62b887b.jpg?ex=6b010536&is=6affb3b6&hm=804023cd54538e2376db0fac205e9153baff7bc211cddde836e2e0abb3a36d0b", "rimuru_ur_長宗我部元親_main.jpg", "https://cdn.discordapp.com/attachments/1195558597132832798/1195558705979207783/UR.png?ex=6b01054f&is=6affb3cf&hm=6c4b4e9ed2c1e71b52d3bc66753ad2ddeb8fb7b8a02dd98f231015508f565c74", "rimuru_ur_長宗我部元親_info.webp"),
    ("rimuru_ur_馬超", "https://cdn.discordapp.com/attachments/1268394008489496577/1268394009093738569/3321.jpg?ex=6b0100f9&is=6affaf79&hm=eeb2f7154b2ce451a9e0c7ba2d1e3d75c8be350416f67e0eed4e8ec4b402df52", "rimuru_ur_馬超_main.jpg", "https://cdn.discordapp.com/attachments/1268394008489496577/1268394137359618090/1.png?ex=6b010117&is=6affaf97&hm=d3c9d2cec560d4ef8fa5c865bb47a39ac1a83ffb2700e40199e31118b6fa76b1", "rimuru_ur_馬超_info.webp"),
    ("rimuru_ur_メフィスト", "https://cdn.discordapp.com/attachments/1307910780813049906/1307910781530279936/4361.jpg?ex=6b011056&is=6affbed6&hm=de369c363d99154c6e145c15b055a739faacff38e5b872d16b97169a88557b7c", "rimuru_ur_メフィスト_main.jpg", "https://cdn.discordapp.com/attachments/1307910780813049906/1307910909162946640/1.png?ex=6b011074&is=6affbef4&hm=ba403956c79f4ee6d66ae4acd0c2b620d73346e5ccd7da9482dc1457ead7cb99", "rimuru_ur_メフィスト_info.webp"),
    ("rimuru_ur_雪女", "https://cdn.discordapp.com/attachments/1257167894874427493/1257167895096721428/3073.jpg?ex=6b010857&is=6affb6d7&hm=bae5e7fff7312bdda13db67e0151023205e100aab9f9c2b18ee7aaa3c789efc4", "rimuru_ur_雪女_main.jpg", "https://cdn.discordapp.com/attachments/1257167894874427493/1257168902450974750/1.png?ex=6b010947&is=6affb7c7&hm=1f8e48ad67f9906e69e840a534c486489cfe6a253943083fac7154388b7837d7", "rimuru_ur_雪女_info.webp"),
    ("rimuru_ur_劉備", "https://cdn.discordapp.com/attachments/1279627778366636053/1279627799585624135/3541.jpg?ex=6b0100c1&is=6affaf41&hm=a646354c359674798eb9e277826d1961d3c8a9c3a2f4e9af196232d160061d", "rimuru_ur_劉備_main.jpg", "https://cdn.discordapp.com/attachments/1279627778366636053/1279627884704829501/1.png?ex=6b0100d6&is=6affaf56&hm=55d74eed83b914e4649d2fc2b7690440893ebc770740592e1e3ac3483188d3c3", "rimuru_ur_劉備_info.webp"),
    ("rimuru_ursen_董卓", "https://cdn.discordapp.com/attachments/1547812569987817582/1547812570843451394/7cf1e06ae43e185e.jpg?ex=6b011149&is=6affbfc9&hm=1959e30ec7fc1d861223a3698fccb2f9de0dd9a7af48077f0df76bc323f49001", "rimuru_ursen_董卓_main.jpg", "https://cdn.discordapp.com/attachments/1547812569987817582/1547812783901376613/cbeb9e1a1a6028ef.png?ex=6b01117c&is=6affbffc&hm=78171e3ffa28e7d6132e716874ebd6d41e3178c857f6864188b592b048bd6d11", "rimuru_ursen_董卓_info.webp"),
]

def download_bytes(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=25) as res:
        if res.status != 200:
            raise RuntimeError(f"HTTP {res.status}")
        return res.read()

def main():
    failed = []
    total_bytes = 0
    over_limit = []

    for cid, main_url, main_file, info_url, info_file in ITEMS:
        main_path = os.path.join(OUT_DIR, main_file)
        info_path = os.path.join(OUT_DIR, info_file)
        try:
            # 1. Main image (save raw)
            main_bytes = download_bytes(main_url)
            with open(main_path, 'wb') as f:
                f.write(main_bytes)
            main_size = len(main_bytes)

            # 2. Info image (resize width > 1100 -> 1100, convert to WebP quality=88)
            info_raw = download_bytes(info_url)
            with Image.open(io.BytesIO(info_raw)) as im:
                if im.mode not in ('RGB', 'RGBA'):
                    im = im.convert('RGBA')
                w, h = im.size
                if w > 1100:
                    new_h = int(round(h * (1100.0 / w)))
                    im = im.resize((1100, new_h), Image.Resampling.LANCZOS)
                im.save(info_path, format='WEBP', quality=88, method=6)
            info_size = os.path.getsize(info_path)

            total_bytes += main_size + info_size
            if main_size >= 1.5 * 1024 * 1024:
                over_limit.append((main_file, main_size))
            if info_size >= 1.5 * 1024 * 1024:
                over_limit.append((info_file, info_size))

            print(f"[OK] {cid}: main={main_size/1024:.1f}KB, info={info_size/1024:.1f}KB ({im.size[0]}x{im.size[1]})")
        except Exception as e:
            print(f"[FAIL] {cid}: {e}")
            failed.append((cid, str(e)))
            # Clean partial files if failed
            for p in (main_path, info_path):
                if os.path.exists(p):
                    os.remove(p)

    print("\n================ DOWNLOAD & CONVERT SUMMARY ================")
    print(f"Succeeded: {len(ITEMS) - len(failed)} / {len(ITEMS)}")
    print(f"Failed: {len(failed)}")
    if failed:
        for cid, err in failed:
            print(f"  FAILED ID: {cid} -> {err}")
    print(f"Total added size: {total_bytes / (1024*1024):.2f} MB ({total_bytes} bytes)")
    print(f"Files >= 1.5MB: {over_limit}")

if __name__ == '__main__':
    main()
